import { defineComponent, ref, reactive, onMounted, watch } from "vue";
import {
  ElButton,
  ElSelect,
  ElOption,
  ElProgress,
  ElDivider,
} from "element-plus";
import { VideoPlay, Refresh, Setting } from "@element-plus/icons-vue";
import VueDraggableResizable from "vue-draggable-resizable";
import "./FloatingTestPanel.css";

// 测试用例列表 - 与TestPage保持一致
const testCases = [
  { name: "simpleTest", description: "简单测试 - 单用户插入操作" },
  {
    name: "simpleTwoUserTest",
    description: "简单双用户测试 - 两个用户插入操作",
  },
  {
    name: "basicInsertConflict",
    description: "Case 1: 基础插入冲突 - 两个用户在相同位置插入不同字符",
  },
  {
    name: "insertAtDifferentPositions",
    description: "Case 2: 不同位置插入 - 测试非冲突情况",
  },
  {
    name: "concurrentDeleteAndInsert",
    description: "Case 3: 并发删除和插入 - 测试删除/插入冲突",
  },
  {
    name: "formatConflict",
    description: "Case 4: 格式冲突 - 测试属性合并冲突",
  },
  {
    name: "deleteConflict",
    description: "Case 5: 删除冲突 - 测试删除冲突处理",
  },
  {
    name: "samePositionDeleteConflict",
    description: "Case 5.1: 相同位置删除冲突 - 测试相同位置删除",
  },
  {
    name: "complexInsertConflict",
    description: "Case 6: 复杂插入冲突 - 测试复杂插入冲突",
  },
  {
    name: "insertAndDeleteOverlap",
    description: "Case 7: 插入删除重叠 - 测试插入删除重叠冲突",
  },
  {
    name: "formatAndContentConflict",
    description: "Case 8: 格式内容混合冲突 - 测试格式与内容混合冲突",
  },
  {
    name: "multipleFormatConflict",
    description: "Case 9: 多属性格式冲突 - 测试多属性格式冲突",
  },
  {
    name: "attributeConflictStrategy",
    description: "Case 9.1: 属性冲突策略 - 测试颜色属性冲突解决",
  },
  {
    name: "sequentialOperations",
    description: "Case 10: 连续操作 - 测试操作序列的正确性",
  },
  {
    name: "boundaryOperations",
    description: "Case 11: 边界操作 - 测试边界情况",
  },
  {
    name: "largeTextOperations",
    description: "Case 12: 大文本操作 - 测试大文本操作的性能",
  },
  {
    name: "formatRemovalConflict",
    description: "Case 13: 格式移除冲突 - 测试格式移除与格式设置的冲突",
  },
  {
    name: "mixedOperations",
    description: "Case 14: 混合操作 - 包含插入、删除、格式设置的混合操作",
  },
  {
    name: "networkLatencySimulation",
    description: "Case 15: 网络延迟模拟 - 测试不同延迟下的冲突解决",
  },
  {
    name: "multipleUserConflict",
    description: "Case 16: 多用户冲突 - 三个用户同时操作",
  },
  {
    name: "rapidSuccessiveOperations",
    description:
      "Case 17: 快速连续操作 - 测试系统在高频操作下的稳定性 (修复版)",
  },
  {
    name: "rapidSuccessiveOperationsAdvanced",
    description: "Case 17.5: 高级快速连续操作 - 更复杂的OT算法稳定性测试",
  },
  {
    name: "extremeRapidSuccessiveOperations",
    description: "Case 17.6: 极端快速连续操作 - 强制制造相同位置冲突测试",
  },
  {
    name: "complexFormatMerging",
    description: "Case 18: 复杂格式合并 - 测试多个格式属性的正确合并",
  },
  {
    name: "partialFormatConflict",
    description: "Case 19: 部分格式冲突 - 测试重叠但不完全相同的格式范围",
  },
  {
    name: "insertWithFormatConflict",
    description: "Case 20: 插入带格式冲突 - 插入带格式的文本与格式设置的冲突",
  },
  {
    name: "deleteAcrossFormattedText",
    description: "Case 21: 删除跨越格式文本 - 删除跨越格式文本的操作",
  },
  {
    name: "retainZeroEdgeCases",
    description: "Case 22: retain(0)边界情况 - 测试retain(0)的各种边界情况",
  },
  {
    name: "emptyDocumentOperations",
    description: "Case 23: 空文档操作 - 空文档上的各种操作测试",
  },
  {
    name: "longTextWithFormatting",
    description: "Case 24: 长文本格式操作 - 长文本与格式的混合操作",
  },
  {
    name: "formatRemovalAndAddition",
    description: "Case 25: 格式移除与添加 - 格式移除与添加的冲突测试",
  },
  { name: "stressTest", description: "Case 26: 压力测试 - 大量并发操作" },
  {
    name: "realWorldScenario",
    description: "Case 27: 真实世界场景 - 模拟真实世界的编辑场景",
  },
  {
    name: "edgeCaseOperations",
    description: "Case 28: 边界情况操作 - 各种边界情况的测试",
  },
  {
    name: "formatInheritanceTest",
    description: "Case 29: 格式继承测试 - 测试格式继承和传播",
  },
  {
    name: "concurrentFormatRemoval",
    description: "Case 30: 并发格式移除 - 并发格式移除测试",
  },
];

export default defineComponent({
  name: "FloatingTestPanel",
  components: {
    VueDraggableResizable,
    ElButton,
    ElSelect,
    ElOption,
    ElProgress,
    ElDivider,
    VideoPlay,
    Refresh,
    Setting,
  },
  props: {
    onTestCaseChange: {
      type: Function as unknown as () => (testCase: any) => void,
      required: true,
    },
    onRunTest: {
      type: Function as unknown as () => (testCaseName: string) => void,
      required: true,
    },
    onStopTest: {
      type: Function as unknown as () => () => void,
      required: true,
    },
    onResetTest: {
      type: Function as unknown as () => () => void,
      required: true,
    },
    // 从父组件接收状态
    isRunning: {
      type: Boolean,
      default: false,
    },
    progress: {
      type: Number,
      default: 0,
    },
    progressText: {
      type: String,
      default: "",
    },
    testResults: {
      type: Object as () => Record<string, any>,
      default: () => ({}),
    },
    logs: {
      type: Array as () => string[],
      default: () => [],
    },
  },
  setup(props) {
    // 面板状态
    const panelState = reactive({
      x: 20,
      y: 20,
      width: 600,
      height: 400,
      isMinimized: false,
    });

    // 测试状态
    const currentTestCase = ref<string>("");

    // 从localStorage恢复状态
    onMounted(() => {
      const savedTestCase = localStorage.getItem("currentTestCase");
      if (savedTestCase) {
        currentTestCase.value = savedTestCase;
        const testCase = testCases.find((tc) => tc.name === savedTestCase);
        if (testCase) {
          props.onTestCaseChange(testCase);
        }
      }

      // 恢复面板位置和大小
      const savedPanelState = localStorage.getItem("floatingTestPanelState");
      if (savedPanelState) {
        const state = JSON.parse(savedPanelState);
        // 只恢复位置和最小化状态，强制使用新的默认尺寸
        panelState.x = state.x || 20;
        panelState.y = state.y || 20;
        panelState.isMinimized = state.isMinimized || false;
        // 强制使用新的默认尺寸，忽略localStorage中保存的尺寸
        panelState.width = 600;
        panelState.height = 400;
      }
    });

    // 保存面板状态
    const savePanelState = () => {
      localStorage.setItem(
        "floatingTestPanelState",
        JSON.stringify(panelState)
      );
    };

    // 监听面板状态变化
    watch(panelState, savePanelState, { deep: true });

    // 强制设置初始尺寸
    onMounted(() => {
      // 确保面板使用正确的尺寸
      panelState.width = 600;
      panelState.height = 400;
    });

    // 测试用例选择
    const handleTestCaseChange = (value: string) => {
      currentTestCase.value = value;
      localStorage.setItem("currentTestCase", value);
      const testCase = testCases.find((tc) => tc.name === value);
      if (testCase) {
        props.onTestCaseChange(testCase);
      }
    };

    // 运行测试
    const runTest = async () => {
      if (!currentTestCase.value || props.isRunning) return;

      const testCase = testCases.find(
        (tc) => tc.name === currentTestCase.value
      );
      if (!testCase) return;

      // 通知父组件执行测试
      props.onRunTest(currentTestCase.value);
    };

    // 停止测试
    const stopTest = () => {
      props.onStopTest();
    };

    // 重置测试
    const resetTest = () => {
      props.onResetTest();
    };

    // 切换面板状态
    const toggleMinimize = () => {
      panelState.isMinimized = !panelState.isMinimized;
      if (panelState.isMinimized) {
        panelState.height = 40; // 最小化时只显示头部
        panelState.width = 200; // 最小化时缩小宽度
      } else {
        panelState.height = 400; // 恢复默认高度
        panelState.width = 600; // 恢复默认宽度
      }
    };

    return () => (
      <VueDraggableResizable
        v-model:w={panelState.width}
        v-model:h={panelState.height}
        v-model:x={panelState.x}
        v-model:y={panelState.y}
        parent={true}
        min-width={300}
        min-height={40}
        max-width={1200}
        max-height={800}
        draggable={true}
        resizable={!panelState.isMinimized}
        class="floating-test-panel"
      >
        {/* 面板头部 */}
        <div class="panel-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Setting style={{ width: "16px", height: "16px" }} />
            <span style={{ fontWeight: "bold", fontSize: "14px" }}>
              测试控制面板
            </span>
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            <ElButton
              size="small"
              onClick={toggleMinimize}
              style={{ padding: "4px 8px", minWidth: "auto" }}
            >
              {panelState.isMinimized ? "□" : "−"}
            </ElButton>
          </div>
        </div>

        {/* 面板内容 - 根据状态显示 */}
        {!panelState.isMinimized && (
          <div class="panel-content">
            {/* 测试用例选择 */}
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  fontSize: "12px",
                  marginBottom: "4px",
                  color: "#606266",
                }}
              >
                测试用例
              </div>
              <ElSelect
                v-model={currentTestCase.value}
                placeholder="选择测试用例"
                size="small"
                style={{ width: "100%" }}
                onChange={handleTestCaseChange}
              >
                {testCases.map((testCase) => (
                  <ElOption
                    key={testCase.name}
                    label={`Case ${testCase.name}: ${testCase.description}`}
                    value={testCase.name}
                  />
                ))}
              </ElSelect>
            </div>

            {/* 操作按钮 */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <ElButton
                type="primary"
                size="small"
                icon={VideoPlay}
                onClick={runTest}
                disabled={props.isRunning || !currentTestCase.value}
                style={{ flex: 1 }}
              >
                运行测试
              </ElButton>
              <ElButton
                type="danger"
                size="small"
                onClick={stopTest}
                disabled={!props.isRunning}
              >
                停止
              </ElButton>
              <ElButton
                size="small"
                icon={Refresh}
                onClick={resetTest}
                disabled={props.isRunning}
              >
                重置
              </ElButton>
            </div>

            {/* 执行进度 */}
            {props.isRunning && (
              <div style={{ marginBottom: "12px" }}>
                <ElProgress
                  percentage={props.progress}
                  status={props.progress === 100 ? "success" : undefined}
                  stroke-width={6}
                />
                <div
                  style={{
                    fontSize: "12px",
                    color: "#606266",
                    marginTop: "4px",
                  }}
                >
                  {props.progressText}
                </div>
              </div>
            )}

            {/* 测试结果 */}
            {Object.keys(props.testResults).length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <ElDivider content-position="left" style={{ fontSize: "12px" }}>
                  测试结果
                </ElDivider>
                <div style={{ fontSize: "12px" }}>
                  {Object.entries(props.testResults).map(([key, value]) => (
                    <div key={key} style={{ marginBottom: "4px" }}>
                      <span style={{ fontWeight: "bold" }}>{key}:</span>{" "}
                      <span style={{ color: value ? "#67c23a" : "#f56c6c" }}>
                        {value ? "通过" : "失败"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 执行日志 */}
            {props.logs.length > 0 && (
              <div>
                <ElDivider content-position="left" style={{ fontSize: "12px" }}>
                  执行日志
                </ElDivider>
                <div
                  style={{
                    maxHeight: "120px",
                    overflow: "auto",
                    backgroundColor: "#f8f9fa",
                    padding: "8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    lineHeight: "1.4",
                  }}
                >
                  {props.logs.map((log, index) => (
                    <div key={index} style={{ marginBottom: "2px" }}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 面板内容 */}
        {!panelState.isMinimized && (
          <div class="panel-content">
            {/* 测试用例选择 */}
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  marginBottom: "6px",
                  fontSize: "12px",
                  color: "#606266",
                }}
              >
                测试用例
              </div>
              <ElSelect
                v-model={currentTestCase.value}
                placeholder="选择测试用例"
                style={{ width: "100%" }}
                filterable
                onChange={handleTestCaseChange}
              >
                {testCases.map((testCase, index) => (
                  <ElOption
                    key={testCase.name}
                    label={`Case ${index + 1}: ${testCase.description}`}
                    value={testCase.name}
                  />
                ))}
              </ElSelect>
            </div>

            {/* 控制按钮 */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <ElButton
                type="primary"
                size="small"
                icon={VideoPlay}
                onClick={runTest}
                disabled={props.isRunning || !currentTestCase.value}
                style={{ flex: 1 }}
              >
                运行测试
              </ElButton>
              <ElButton
                type="danger"
                size="small"
                onClick={stopTest}
                disabled={!props.isRunning}
              >
                停止
              </ElButton>
              <ElButton
                size="small"
                icon={Refresh}
                onClick={resetTest}
                disabled={props.isRunning}
              >
                重置
              </ElButton>
            </div>

            {/* 执行进度 */}
            {props.isRunning && (
              <div style={{ marginBottom: "12px" }}>
                <ElProgress
                  percentage={props.progress}
                  status={props.progress === 100 ? "success" : undefined}
                  stroke-width={6}
                />
                <div
                  style={{
                    fontSize: "12px",
                    color: "#606266",
                    marginTop: "4px",
                  }}
                >
                  {props.progressText}
                </div>
              </div>
            )}

            {/* 测试结果 */}
            {Object.keys(props.testResults).length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <ElDivider content-position="left" style={{ fontSize: "12px" }}>
                  测试结果
                </ElDivider>
                <div style={{ fontSize: "12px" }}>
                  {Object.entries(props.testResults).map(([key, value]) => (
                    <div key={key} style={{ marginBottom: "4px" }}>
                      <span style={{ fontWeight: "bold" }}>{key}:</span>{" "}
                      <span style={{ color: value ? "#67c23a" : "#f56c6c" }}>
                        {value ? "通过" : "失败"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 执行日志 */}
            {props.logs.length > 0 && (
              <div>
                <ElDivider content-position="left" style={{ fontSize: "12px" }}>
                  执行日志
                </ElDivider>
                <div
                  style={{
                    maxHeight: "120px",
                    overflow: "auto",
                    backgroundColor: "#f8f9fa",
                    padding: "8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    lineHeight: "1.4",
                  }}
                >
                  {props.logs.map((log, index) => (
                    <div key={index} style={{ marginBottom: "2px" }}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </VueDraggableResizable>
    );
  },
});
