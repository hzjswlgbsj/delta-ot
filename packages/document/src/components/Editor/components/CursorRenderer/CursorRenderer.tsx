import { CursorInfo } from "@delta-ot/collaborate";

export class CursorRenderer {
  private cursorContainer: HTMLElement;
  private cursors: Map<string, HTMLElement> = new Map();
  private positionCursors: Map<number, Set<string>> = new Map();
  private selectionHighlights: Map<string, HTMLElement> = new Map(); // 新增：选区高亮映射
  private editorElement: HTMLElement; // 新增：保存编辑器元素引用

  constructor(editorElement: HTMLElement) {
    this.editorElement = editorElement;
    this.createCursorContainer(editorElement);

    // 初始化时确保原生光标可见
    this.updateNativeCursorVisibility();
  }

  private createCursorContainer(editorElement: HTMLElement) {
    this.cursorContainer = document.createElement("div");
    this.cursorContainer.className = "cursor-container";
    this.cursorContainer.style.position = "absolute";
    this.cursorContainer.style.top = "0";
    this.cursorContainer.style.left = "0";
    this.cursorContainer.style.width = "100%";
    this.cursorContainer.style.height = "100%";
    this.cursorContainer.style.pointerEvents = "none";
    this.cursorContainer.style.zIndex = "99999"; // 提高 z-index
    this.cursorContainer.style.overflow = "visible"; // 改为 visible
    this.cursorContainer.style.backgroundColor = "transparent"; // 恢复透明背景

    // 确保编辑器父元素有相对定位
    const editorParent = editorElement.parentElement;
    if (editorParent) {
      editorParent.style.position = "relative";

      // 将光标容器添加到编辑器父元素，而不是编辑器元素本身
      editorParent.appendChild(this.cursorContainer);
    } else {
      // 如果没有父元素，则添加到编辑器元素
      editorElement.appendChild(this.cursorContainer);
    }
  }

  // 新增：更新原生光标显示状态
  private updateNativeCursorVisibility() {
    // 永远保持原生光标可见，让本地用户的光标永远显示
    // 远程用户的自定义光标会覆盖在原生光标上方
    const editorElement = this.editorElement.querySelector(
      ".ql-editor"
    ) as HTMLElement;

    if (editorElement) {
      // 确保原生光标永远可见
      editorElement.style.caretColor = "auto";
    }
  }

  updateCursor(
    cursor: CursorInfo,
    bounds: { left: number; top: number; height: number },
    selectionBounds?: {
      start: { left: number; top: number; height: number };
      end: { left: number; top: number; height: number };
      width: number;
      height: number;
      top: number;
      left: number;
      isMultiLine?: boolean;
    },
    isLocalUser: boolean = false
  ) {
    const { userId, userName, color, index, length } = cursor;

    // 移除旧光标和选区高亮
    this.removeCursor(userId);

    // 如果是本地用户，不显示任何自定义光标和选区高亮
    if (isLocalUser) {
      // 更新原生光标显示状态
      this.updateNativeCursorVisibility();
      return;
    }

    try {
      // 获取该位置的所有光标数量
      const cursorsAtPosition = this.positionCursors.get(index) || new Set();
      const cursorIndex = cursorsAtPosition.size;

      // 将当前用户添加到该位置的光标集合中
      cursorsAtPosition.add(userId);
      this.positionCursors.set(index, cursorsAtPosition);

      // 计算标签的垂直偏移量
      const labelOffset = cursorIndex * 20;

      // 创建光标元素
      const cursorElement = this.createCursorElement(bounds, color, length);
      cursorElement.setAttribute("data-user-id", userId);
      cursorElement.setAttribute("data-position", index.toString());
      cursorElement.setAttribute("data-length", length.toString());

      // 创建用户标签
      const label = this.createLabelElement(userName, color, labelOffset);
      cursorElement.appendChild(label);

      this.cursorContainer.appendChild(cursorElement);
      this.cursors.set(userId, cursorElement);

      // 如果有选区，创建选区高亮
      if (length > 0 && selectionBounds) {
        this.createSelectionHighlight(userId, selectionBounds);
      }

      // 更新原生光标显示状态
      this.updateNativeCursorVisibility();
    } catch (error) {
      console.warn("更新光标失败:", error);
    }
  }

  private createCursorElement(
    bounds: { left: number; top: number; height: number },
    color: string,
    length: number
  ): HTMLElement {
    const cursorElement = document.createElement("div");
    cursorElement.className = "simple-cursor";

    cursorElement.style.position = "absolute";
    cursorElement.style.left = `${bounds.left}px`;
    cursorElement.style.top = `${bounds.top}px`;
    cursorElement.style.width = "2px"; // 恢复正常的 2px 宽度
    cursorElement.style.height = `${bounds.height}px`;
    cursorElement.style.backgroundColor = color || "#666";
    cursorElement.style.pointerEvents = "none";
    cursorElement.style.zIndex = "100000";
    cursorElement.style.borderRadius = "0";

    return cursorElement;
  }

  private createSelectionHighlight(
    userId: string,
    selectionBounds: {
      start: { left: number; top: number; height: number };
      end: { left: number; top: number; height: number };
      width: number;
      height: number;
      top: number;
      left: number;
      isMultiLine?: boolean;
    }
  ) {
    // 创建选区高亮元素
    const selectionHighlight = document.createElement("div");
    selectionHighlight.className = "selection-highlight";
    selectionHighlight.setAttribute("data-user-id", userId);

    // 设置选区样式 - 使用浏览器默认的选中效果
    selectionHighlight.style.position = "absolute";
    selectionHighlight.style.left = `${selectionBounds.left}px`;
    selectionHighlight.style.top = `${selectionBounds.top}px`;
    selectionHighlight.style.width = `${selectionBounds.width}px`;
    selectionHighlight.style.height = `${selectionBounds.height}px`;

    // 使用浏览器默认的选中背景色
    selectionHighlight.style.backgroundColor = "#0078d7"; // 类似浏览器默认选中色
    selectionHighlight.style.opacity = "0.3";
    selectionHighlight.style.pointerEvents = "none";
    selectionHighlight.style.zIndex = "99998"; // 在光标下方
    selectionHighlight.style.borderRadius = "0"; // 移除圆角，更像浏览器默认效果

    this.cursorContainer.appendChild(selectionHighlight);
    this.selectionHighlights.set(userId, selectionHighlight);
  }

  private createLabelElement(
    userName: string,
    color: string,
    labelOffset: number
  ): HTMLElement {
    const label = document.createElement("div");
    label.className = "cursor-label";
    label.innerText = userName;

    label.style.position = "absolute";
    label.style.top = `${-10 - labelOffset}px`;
    label.style.left = "0px";
    label.style.transform = "none";
    label.style.backgroundColor = color || "#666";
    label.style.color = "#ffffff";
    label.style.fontSize = "10px";
    label.style.fontWeight = "400";
    label.style.padding = "1px 4px";
    label.style.borderRadius = "2px";
    label.style.whiteSpace = "nowrap";
    label.style.pointerEvents = "none";
    label.style.border = "none";
    label.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.1)";
    label.style.fontFamily =
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    label.style.opacity = "1";
    label.style.zIndex = "100002"; // 提高 z-index

    return label;
  }

  removeCursor(userId: string) {
    const cursorElement = this.cursors.get(userId);
    if (cursorElement) {
      const position = cursorElement.getAttribute("data-position");
      if (position) {
        const positionNum = parseInt(position);
        const cursorsAtPosition = this.positionCursors.get(positionNum);
        if (cursorsAtPosition) {
          cursorsAtPosition.delete(userId);
          if (cursorsAtPosition.size === 0) {
            this.positionCursors.delete(positionNum);
          } else {
            this.rearrangeCursorsAtPosition(positionNum);
          }
        }
      }

      cursorElement.remove();
      this.cursors.delete(userId);
    }

    const selectionHighlight = this.selectionHighlights.get(userId);
    if (selectionHighlight) {
      selectionHighlight.remove();
      this.selectionHighlights.delete(userId);
    }

    // 更新原生光标显示状态
    this.updateNativeCursorVisibility();
  }

  private rearrangeCursorsAtPosition(position: number) {
    const cursorsAtPosition = this.positionCursors.get(position);
    if (!cursorsAtPosition) return;

    let index = 0;
    cursorsAtPosition.forEach((userId) => {
      const cursorElement = this.cursors.get(userId);
      if (cursorElement) {
        const label = cursorElement.querySelector(
          ".cursor-label"
        ) as HTMLElement;
        if (label) {
          label.style.top = `${-10 - index * 20}px`;
        }
      }
      index++;
    });
  }

  clearAll() {
    this.cursorContainer.innerHTML = "";
    this.cursors.clear();
    this.positionCursors.clear();
    this.selectionHighlights.forEach((highlight) => highlight.remove());
    this.selectionHighlights.clear();

    // 更新原生光标显示状态
    this.updateNativeCursorVisibility();
  }

  destroy() {
    if (this.cursorContainer && this.cursorContainer.parentNode) {
      this.cursorContainer.parentNode.removeChild(this.cursorContainer);
    }
  }
}
