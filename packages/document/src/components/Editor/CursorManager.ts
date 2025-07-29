import { CursorInfo, UserStatus } from "@delta-ot/collaborate";
import { CursorRenderer } from "./CursorRenderer";

export class CursorManager {
  private quill: any;
  private cursorRenderer: CursorRenderer;
  private cursors: Map<string, CursorInfo> = new Map();

  constructor(quill: any) {
    this.quill = quill;
    this.cursorRenderer = new CursorRenderer(quill.root);
  }

  updateCursor(cursor: CursorInfo) {
    const { userId, status } = cursor;

    // 根据状态处理光标
    if (status === UserStatus.OFFLINE) {
      // 用户离线，移除光标
      this.removeCursor(userId);
      return;
    }

    // 更新内部状态
    this.cursors.set(userId, cursor);

    try {
      // 获取光标位置
      const bounds = this.quill.getBounds(cursor.index);

      if (!bounds) {
        console.warn("无法获取光标位置，bounds 为空");
        return;
      }

      // 委托给渲染器处理 UI 更新
      this.cursorRenderer.updateCursor(cursor, bounds);
    } catch (error) {
      console.warn("更新光标失败:", error);
    }
  }

  removeCursor(userId: string) {
    // 从内部状态移除
    this.cursors.delete(userId);

    // 委托给渲染器处理 UI 移除
    this.cursorRenderer.removeCursor(userId);
  }

  clearAll() {
    // 清空内部状态
    this.cursors.clear();

    // 委托给渲染器处理 UI 清空
    this.cursorRenderer.clearAll();
  }

  getCursorCount(): number {
    return this.cursors.size;
  }

  getCursor(userId: string): CursorInfo | undefined {
    return this.cursors.get(userId);
  }

  getAllCursors(): CursorInfo[] {
    return Array.from(this.cursors.values());
  }

  // 获取活跃光标（排除离线用户）
  getActiveCursors(): CursorInfo[] {
    return Array.from(this.cursors.values()).filter(
      (cursor) => cursor.status !== UserStatus.OFFLINE
    );
  }

  destroy() {
    this.cursorRenderer.destroy();
    this.cursors.clear();
  }
}
