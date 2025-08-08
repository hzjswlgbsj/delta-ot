import { defineComponent, ref, onMounted } from "vue";
import { DocumentManager } from "../../controllers/DocumentManager";
import { OperationBufferOptions } from "@delta-ot/collaborate";
import Delta from "quill-delta";

export default defineComponent({
  name: "OperationBufferIntegrationTest",
  setup() {
    const testResults = ref<string[]>([]);
    const bufferStatus = ref<any>(null);

    const addResult = (message: string) => {
      testResults.value.push(`${new Date().toLocaleTimeString()}: ${message}`);
    };

    const testOperationBuffer = async () => {
      addResult("开始测试OperationBuffer集成...");

      try {
        // 模拟用户信息
        const mockUser = {
          userId: "test-user",
          userName: "TestUser",
        };

        // 创建DocumentManager实例
        const docManager = new DocumentManager();

        // 配置缓冲器选项
        const bufferOptions: OperationBufferOptions = {
          debounceDelay: 100,
          maxBufferTime: 500,
          maxOperations: 5,
          enableCompose: true,
        };

        // 初始化文档管理器
        await docManager.setup("test-doc", mockUser, new Delta(), {
          bufferOptions,
        });

        addResult("DocumentManager初始化成功");

        // 测试操作缓冲
        const delta1 = new Delta().insert("Hello");
        const delta2 = new Delta().retain(5).insert(" World");
        const delta3 = new Delta().retain(11).insert("!");

        addResult(`添加操作1: ${JSON.stringify(delta1.ops)}`);
        docManager.commitDelta(delta1);

        addResult(`添加操作2: ${JSON.stringify(delta2.ops)}`);
        docManager.commitDelta(delta2);

        addResult(`添加操作3: ${JSON.stringify(delta3.ops)}`);
        docManager.commitDelta(delta3);

        // 检查缓冲区状态
        bufferStatus.value = docManager.getBufferStatus();
        addResult(`缓冲区状态: ${JSON.stringify(bufferStatus.value)}`);

        // 等待一段时间让防抖生效
        await new Promise((resolve) => setTimeout(resolve, 150));

        // 再次检查缓冲区状态
        bufferStatus.value = docManager.getBufferStatus();
        addResult(`防抖后缓冲区状态: ${JSON.stringify(bufferStatus.value)}`);

        // 测试手动刷新
        addResult("测试手动刷新缓冲区...");
        docManager.flushBuffer();

        bufferStatus.value = docManager.getBufferStatus();
        addResult(
          `手动刷新后缓冲区状态: ${JSON.stringify(bufferStatus.value)}`
        );

        // 测试远程操作处理
        addResult("测试远程操作处理...");
        const remoteDelta = new Delta().retain(2).insert("Remote");
        docManager.commitDelta(remoteDelta);

        // 模拟收到远程操作
        addResult("模拟收到远程操作...");
        docManager.handleRemoteOp(new Delta().insert("RemoteOp"));

        bufferStatus.value = docManager.getBufferStatus();
        addResult(
          `远程操作处理后缓冲区状态: ${JSON.stringify(bufferStatus.value)}`
        );

        addResult("OperationBuffer集成测试完成！");
      } catch (error) {
        addResult(`测试失败: ${error}`);
        console.error("测试失败:", error);
      }
    };

    onMounted(() => {
      testOperationBuffer();
    });

    return () => (
      <div style={{ padding: "20px", fontFamily: "monospace" }}>
        <h2>OperationBuffer集成测试</h2>
        <div style={{ marginBottom: "20px" }}>
          <h3>测试结果:</h3>
          <div
            style={{
              backgroundColor: "#f5f5f5",
              padding: "10px",
              borderRadius: "4px",
              maxHeight: "400px",
              overflowY: "auto",
            }}
          >
            {testResults.value.map((result, index) => (
              <div key={index} style={{ marginBottom: "5px" }}>
                {result}
              </div>
            ))}
          </div>
        </div>

        {bufferStatus.value && (
          <div style={{ marginBottom: "20px" }}>
            <h3>当前缓冲区状态:</h3>
            <pre
              style={{
                backgroundColor: "#f0f0f0",
                padding: "10px",
                borderRadius: "4px",
                overflow: "auto",
              }}
            >
              {JSON.stringify(bufferStatus.value, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  },
});
