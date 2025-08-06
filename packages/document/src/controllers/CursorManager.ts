import { CursorInfo, UserStatus } from "@delta-ot/collaborate";
import { CursorRenderer } from "../components/Editor/components/CursorRenderer";

export class CursorManager {
  private quill: any;
  private cursorRenderer: CursorRenderer;
  private cursors: Map<string, CursorInfo> = new Map();

  constructor(quill: any) {
    this.quill = quill;
    this.cursorRenderer = new CursorRenderer(quill.root);
  }

  updateCursor(cursor: CursorInfo, isLocalUser: boolean = false) {
    const { userId, status, index, length } = cursor;

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
      const bounds = this.quill.getBounds(index);

      if (!bounds) {
        console.warn("无法获取光标位置，bounds 为空");
        return;
      }

      // 如果有选区，计算选区的边界信息
      if (length > 0) {
        const selectionBounds = this.calculateSelectionBounds(index, length);
        // 委托给渲染器处理 UI 更新，传递选区边界信息
        this.cursorRenderer.updateCursor(
          cursor,
          bounds,
          selectionBounds,
          isLocalUser
        );
      } else {
        // 没有选区，只传递光标位置
        this.cursorRenderer.updateCursor(
          cursor,
          bounds,
          undefined,
          isLocalUser
        );
      }
    } catch (error) {
      console.warn("更新光标失败:", error);
    }
  }

  private calculateSelectionBounds(index: number, length: number) {
    try {
      // 计算选区的起始和结束位置
      const startBounds = this.quill.getBounds(index);
      const endBounds = this.quill.getBounds(index + length);

      if (!startBounds || !endBounds) {
        console.warn("无法获取选区边界");
        return null;
      }

      // 计算选区的宽度和位置
      // 如果选区在同一行，直接计算宽度
      if (Math.abs(startBounds.top - endBounds.top) < 5) {
        // 允许5px的误差
        const selectionWidth = Math.max(2, endBounds.left - startBounds.left);
        return {
          start: startBounds,
          end: endBounds,
          width: selectionWidth,
          height: startBounds.height,
          top: startBounds.top,
          left: startBounds.left,
          isMultiLine: false,
        };
      } else {
        // 多行选区，需要特殊处理
        // 获取编辑器容器的宽度
        const editorWidth = this.quill.root.offsetWidth;
        const padding = 16; // 编辑器的内边距
        const availableWidth = editorWidth - padding * 2;

        // 计算多行选区的高度
        const totalHeight = endBounds.top - startBounds.top + endBounds.height;

        return {
          start: startBounds,
          end: endBounds,
          width: availableWidth,
          height: totalHeight,
          top: startBounds.top,
          left: startBounds.left,
          isMultiLine: true,
        };
      }
    } catch (error) {
      console.warn("计算选区边界失败:", error);
      return null;
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

  getActiveCursors(): CursorInfo[] {
    return Array.from(this.cursors.values()).filter(
      (cursor) => cursor.status !== UserStatus.OFFLINE
    );
  }

  destroy() {
    this.clearAll();
    this.cursorRenderer.destroy();
  }
}
