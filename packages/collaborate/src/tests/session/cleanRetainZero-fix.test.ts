import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTSession } from "../../session/OTSession";
import { ClientMessage } from "../../transport";

describe("cleanRetainZero Fix Verification", () => {
  it("should correctly handle retain(0) operations in OTSession", () => {
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

    // 模拟收到远端操作：在位置0插入"1" (包含 retain(0))
    const remoteOp = new Delta([{ retain: 0 }, { insert: "1" }]);
    session.receiveRemote(remoteOp);

    // 验证最终结果应该是 "1base4"
    expect(session.getDocument().getContents().ops).toEqual([
      { insert: "1base4" },
    ]);
  });

  it("should correctly handle retain(0) in commitLocal", () => {
    // 初始化会话
    const session = new OTSession("user1", new Delta().insert("base"));

    // 提交包含 retain(0) 的本地操作
    const localOp: ClientMessage<Delta> = {
      type: "op" as any,
      uuid: "local-1",
      userId: "user1",
      documentId: "doc1",
      sequence: 1,
      timestamp: Date.now(),
      data: new Delta([{ retain: 0 }, { insert: "1" }]),
    };

    session.commitLocal(localOp);

    // 验证 retain(0) 被正确清理，结果应该是 "1base"
    expect(session.getDocument().getContents().ops).toEqual([
      { insert: "1base" },
    ]);
  });

  it("should correctly handle retain(0) in receiveRemote", () => {
    // 初始化会话
    const session = new OTSession("user1", new Delta().insert("base"));

    // 提交本地操作
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

    // 收到包含 retain(0) 的远端操作
    const remoteOp = new Delta([{ retain: 0 }, { insert: "1" }]);
    session.receiveRemote(remoteOp);

    // 验证最终结果应该是 "1base4"
    expect(session.getDocument().getContents().ops).toEqual([
      { insert: "1base4" },
    ]);
  });

  it("should handle multiple retain(0) operations correctly", () => {
    // 初始化会话
    const session = new OTSession("user1", new Delta().insert("base"));

    // 提交多个包含 retain(0) 的操作
    const localOp1: ClientMessage<Delta> = {
      type: "op" as any,
      uuid: "local-1",
      userId: "user1",
      documentId: "doc1",
      sequence: 1,
      timestamp: Date.now(),
      data: new Delta([{ retain: 0 }, { insert: "1" }]),
    };

    const localOp2: ClientMessage<Delta> = {
      type: "op" as any,
      uuid: "local-2",
      userId: "user1",
      documentId: "doc1",
      sequence: 2,
      timestamp: Date.now(),
      data: new Delta([{ retain: 5 }, { insert: "2" }]),
    };

    session.commitLocal(localOp1);
    session.commitLocal(localOp2);

    // 验证结果应该是 "1base2"
    expect(session.getDocument().getContents().ops).toEqual([
      { insert: "1base2" },
    ]);
  });
});
