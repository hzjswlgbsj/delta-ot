import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTSession } from "../../session/OTSession";
import { ClientMessage } from "../../transport";

describe("OTSession.receiveRemote", () => {
  it("should correctly handle remote operation with local unacknowledged ops", () => {
    // 初始化会话，基础内容为 "base"
    const session = new OTSession("user1", new Delta().insert("base"));

    // 模拟本地提交操作：在位置4插入"4"
    const localOp: ClientMessage<Delta> = {
      type: "op" as any,
      uuid: "local-1",
      userId: "user1",
      documentId: "doc1",
      sequence: 1,
      timestamp: Date.now(),
      data: new Delta().retain(4).insert("4"),
    };

    session.commitLocal(localOp);

    // 验证本地操作已应用
    expect(session.getDocument().getContents().ops).toEqual([
      { insert: "base4" },
    ]);

    // 模拟收到远端操作：在位置0插入"1"
    const remoteOp = new Delta().retain(0).insert("1");
    session.receiveRemote(remoteOp);

    // 验证最终结果应该是 "1base4"
    expect(session.getDocument().getContents().ops).toEqual([
      { insert: "1base4" },
    ]);
  });

  it("should handle multiple local operations correctly", () => {
    // 初始化会话
    const session = new OTSession("user1", new Delta().insert("base"));

    // 提交两个本地操作
    const localOp1: ClientMessage<Delta> = {
      type: "op" as any,
      uuid: "local-1",
      userId: "user1",
      documentId: "doc1",
      sequence: 1,
      timestamp: Date.now(),
      data: new Delta().retain(2).insert("X"),
    };

    const localOp2: ClientMessage<Delta> = {
      type: "op" as any,
      uuid: "local-2",
      userId: "user1",
      documentId: "doc1",
      sequence: 2,
      timestamp: Date.now(),
      data: new Delta().retain(5).insert("Y"),
    };

    session.commitLocal(localOp1);
    session.commitLocal(localOp2);

    // 验证本地操作已应用
    expect(session.getDocument().getContents().ops).toEqual([
      { insert: "baXseY" },
    ]);

    // 收到远端操作：在位置1插入"Z"
    const remoteOp = new Delta().retain(1).insert("Z");
    session.receiveRemote(remoteOp);

    // 验证最终结果：远端操作应该正确插入，本地操作被正确调整
    expect(session.getDocument().getContents().ops).toEqual([
      { insert: "bZaXseY" },
    ]);
  });
});
