import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTSession } from "../../session/OTSession";

describe("OTSession conflict resolution", () => {
  it("should resolve same-position insert: B after A (with transform)", () => {
    const userA = new OTSession("A", new Delta().insert("hello"));
    const userB = new OTSession("B", new Delta().insert("hello"));

    const opA = new Delta().retain(0).insert("A");
    const opB = new Delta().retain(0).insert("B");

    // A 和 B 几乎同时提交本地操作并发送（未 ack）
    userA.commitLocal(opA);
    userB.commitLocal(opB);

    // 模拟 A 先到，所以服务端先处理 A 的操作，所以客户端 A 先 ack
    userA.ack();

    // 同时服务端广播 A 的操作到 B，B 先产生了本地操作，需要 transform A，因为
    // A 先到达服务端，所以真实情况此时的 A 也是需要 B 本地自己 transform 的
    userB.receiveRemote(opA);

    // 然后 服务端转发 B 的操作到 A，A 不需要 transform B，因为我们模拟的是 A 先到的情况，
    // 后来的 B 已经通过服务端 transform 过了，这里我们没有模拟服务端的 transform 操作是
    // 因为我们的例子就是 B 也是在 retain(0) 的位置插入，正好不需要服务端转换就已经是对的了。
    // 但是如果 B 的操作是 insert(1) 或者其他位置的插入，这里就需要多一步模拟服务端 transform  B 的操作后再广播给 A 了
    userA.apply(opB);

    // 同时 B 也收到了服务端广播的自己的操作了，此时 B 已经 transform 过 A 的操作了，然后也可以 ack 了，
    // 注意真实情况一定要保证 userB.receiveRemote(opA); 操作已经完成，目前的情况是这个是个同步操作，所以
    // B 也可以在这里直接 ack，如果未来复杂了 transform 动作是异步的话（未来可能有排队机制），那这一步需要等待，
    // 因为 B 的 unacknowledgedOps 是会影响其他端的 ops 的
    userB.ack();

    // 最终内容一致
    expect(userA.getDocument().getContents()).toEqual(
      new Delta().insert("BAhello")
    );
    expect(userB.getDocument().getContents()).toEqual(
      new Delta().insert("BAhello")
    );
  });
});
