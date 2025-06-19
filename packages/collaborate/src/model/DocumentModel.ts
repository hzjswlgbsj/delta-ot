import Delta from "quill-delta";

export class DocumentModel {
  private content: Delta;

  constructor(initialContent: Delta = new Delta()) {
    this.content = initialContent;
  }

  /**
   * 获取当前文档 Delta 状态
   */
  getContents(): Delta {
    return this.content;
  }

  /**
   * 应用一个操作（Delta），返回应用后的结果
   */
  apply(op: Delta): Delta {
    this.content = this.content.compose(op);
    return this.content;
  }

  /**
   * 重置文档内容
   */
  setContents(delta: Delta): void {
    this.content = delta;
  }

  /**
   * 克隆当前文档（返回新的 DocumentModel 实例）
   */
  clone(): DocumentModel {
    return new DocumentModel(this.content.compose(new Delta()));
  }

  /**
   * 打印文档内容（主要用于测试）
   */
  toString(): string {
    return JSON.stringify(this.content.ops);
  }
}
