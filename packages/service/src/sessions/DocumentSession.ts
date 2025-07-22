import Delta, { Op } from "quill-delta";
import { ClientConnection } from "../socket/ClientConnection";
import { ClientMessage, MessageType } from "../socket/types";
import {
  OTEngine,
  DocumentModel,
  AttributeConflictResolver,
} from "@delta-ot/collaborate";
import { OpHistoryBuffer } from "./OpHistoryBuffer";
import { File } from "../db/models/File";
import { getServiceLogger } from "../utils/logger";

/** 表示一个文档的协同会话状态 */
export class DocumentSession {
  documentId: string;
  sequence = 0;

  private clients: Set<ClientConnection> = new Set();
  private historyBuffer = new OpHistoryBuffer();
  private model: DocumentModel;

  private persistTimer?: NodeJS.Timeout;
  private isDirty = false;

  constructor(documentId: string) {
    this.documentId = documentId;
    this.model = new DocumentModel();
  }

  addClient(client: ClientConnection) {
    this.clients.add(client);
  }

  removeClient(client: ClientConnection) {
    this.clients.delete(client);
  }

  /** 广播 OP 给其他客户端 */
  broadcastOp(cmd: ClientMessage<Delta>, excludeUserId?: string) {
    this.clients.forEach((client) => {
      if (excludeUserId && client.getUserId() === excludeUserId) return;
      client.send(client.encodeCmd(cmd));
    });
  }

  /** 当前编辑器内容 */
  getContent(): Op[] {
    return this.model.getContents().ops;
  }

  setContents(delta: Delta) {
    this.model.setContents(delta);
  }

  /** 当前序列号 */
  getSequence(): number {
    return this.sequence;
  }

  /** 当前协同用户列表（userId） */
  getUserIds(): string[] {
    const logger = getServiceLogger("session");
    logger.info(
      "当前文档的协同用户列表:",
      JSON.stringify(
        Array.from(this.clients)
          .map((c) => c.getUserId())
          .filter(Boolean)
      )
    );
    return Array.from(
      new Set(
        Array.from(this.clients)
          .map((c) => c.getUserId())
          .filter(Boolean)
      )
    );
  }

  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * 清理 retain(0) 操作，避免 transform 问题
   * Quill 编辑器会产生 retain(0) 操作，这会导致 transform 结果错误
   */
  private cleanRetainZero(delta: Delta): Delta {
    const cleanedOps = delta.ops.filter((op) => !(op.retain === 0));
    return new Delta(cleanedOps);
  }

  /**
   * 处理并应用客户端发来的 OP（包含 transform、缓存、广播）
   *
   * 1. transform against historyBuffer（如果 seq 落后）
   * 2. apply 到 DocumentModel
   * 3. increment sequence
   * 4. 更新缓存，push 到 historyBuffer
   * 5. broadcast 给所有客户端
   */
  applyClientOperation(cmd: ClientMessage<Delta>, from: ClientConnection) {
    const incomingSeq = cmd.sequence;
    const currentSeq = this.sequence;
    const missedCount = currentSeq - incomingSeq;
    const logger = getServiceLogger("session");
    logger.info("收到客户端操作：", JSON.stringify(cmd), this.sequence);

    // 清理 retain(0) 操作，避免 transform 问题
    let transformedDelta = this.cleanRetainZero(cmd.data as Delta);

    // 1.如果客户端落后，则需要 transform
    if (missedCount > 0) {
      logger.info("转换前：", JSON.stringify(transformedDelta));

      const opsToTransformAgainst = this.historyBuffer.getOpsSince(incomingSeq);
      const availableCount = opsToTransformAgainst.length;

      if (availableCount < missedCount) {
        // 历史不足，无法 transform，拒绝该操作
        logger.warn(
          `客户端 sequence 落后过多：客户端 ${incomingSeq}, 当前 ${currentSeq}，仅找到 ${availableCount} 条历史`
        );

        from.sendCmd(MessageType.NEED_REFRESH, {
          reason: "当前操作已落后过多，协同历史无法补全，请刷新页面",
        });
        return;
      }

      // transform 所有未处理历史
      transformedDelta = opsToTransformAgainst.reduce((acc, historyCmd) => {
        // 同样清理历史操作中的 retain(0)
        const historyDelta = this.cleanRetainZero(new Delta(historyCmd.data));
        // 服务端处理：后到的客户端操作优先级更高
        return OTEngine.transform(historyDelta, acc, false);
      }, transformedDelta);
      logger.info("转换后：", JSON.stringify(transformedDelta));
    }

    // 检查并合并属性冲突（只有在确实有属性冲突时才合并）
    let mergedDelta = transformedDelta;
    if (
      AttributeConflictResolver.isAttributeConflict(cmd.data as Delta) &&
      AttributeConflictResolver.hasAttributeConflict(
        cmd.data as Delta,
        transformedDelta
      )
    ) {
      logger.info("检测到属性冲突，执行冲突合并");
      mergedDelta = AttributeConflictResolver.mergeAttributeConflicts(
        cmd.data as Delta,
        transformedDelta,
        this.historyBuffer.getAll(),
        true // 服务端采用后到优先策略
      );
    } else {
      logger.info("无属性冲突，使用 transform 结果");
    }

    logger.info("最终操作：", JSON.stringify(mergedDelta));

    // 2.应用到文档模型
    const newContent = this.model.apply(mergedDelta);
    this.isDirty = true;

    // 3.序列号递增
    this.incrementSequence();

    // 4.构造广播消息并缓存
    const broadcastCmd: ClientMessage<Delta> = {
      ...cmd,
      data: mergedDelta,
      sequence: this.sequence,
      timestamp: Date.now(),
    };
    this.historyBuffer.push(broadcastCmd);

    // 5.广播给所有客户端（包含自己）
    this.broadcastOp(broadcastCmd);
  }

  /** 启动定时持久化（每 30 秒） */
  startPersistence() {
    if (this.persistTimer) return;

    this.persistTimer = setInterval(() => {
      this.persistToDatabase();
    }, 30000);
  }

  /** 停止持久化定时器 */
  stopPersistence() {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = undefined;
    }
  }

  /** 将当前文档内容写入数据库 */
  private async persistToDatabase() {
    if (!this.isDirty) return;

    try {
      const content = this.model.getContents();
      await File.update(
        {
          content: JSON.stringify(content),
          updatedAt: new Date(),
        },
        { where: { guid: this.documentId } }
      );
      const logger = getServiceLogger("session");
      logger.info(
        `文档 ${this.documentId} 持久化成功`,
        JSON.stringify(content)
      );
      this.isDirty = false;
    } catch (err) {
      const logger = getServiceLogger("session");
      logger.error(`文档 ${this.documentId} 持久化失败`, err);
    }
  }

  /** 序列号递增 */
  incrementSequence() {
    this.sequence += 1;
  }

  /** 销毁 session，清理资源并持久化 */
  async destroy() {
    this.clients.clear();
    this.historyBuffer.clear();
    this.sequence = 0;
    // await this.persistToDatabase();
    this.stopPersistence();
    this.model = new DocumentModel();
  }
}
