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
import { testCases } from "../../constants/testCases";
import styles from "./style.module.less";

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
    // 面板状态 - 默认位置改为左上角
    const panelState = reactive({
      x: 10,
      y: 10,
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

      // 恢复面板位置、大小和收起状态
      const savedPanelState = localStorage.getItem("floatingTestPanelState");
      if (savedPanelState) {
        try {
          const state = JSON.parse(savedPanelState);
          // 恢复位置和收起状态
          panelState.x = state.x || 10;
          panelState.y = state.y || 10;
          panelState.isMinimized = state.isMinimized || false;

          // 根据收起状态设置尺寸
          if (panelState.isMinimized) {
            panelState.width = 200;
            panelState.height = 40;
          } else {
            panelState.width = state.width || 600;
            panelState.height = state.height || 400;
          }
        } catch (error) {
          console.warn("Failed to parse saved panel state:", error);
          // 使用默认值
          panelState.x = 10;
          panelState.y = 10;
          panelState.width = 600;
          panelState.height = 400;
          panelState.isMinimized = false;
        }
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
        min-width={200}
        min-height={40}
        max-width={1200}
        max-height={800}
        draggable={true}
        resizable={!panelState.isMinimized}
        class={styles.floatingTestPanel}
      >
        {/* 面板头部 */}
        <div class={styles.panelHeader}>
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
          <div class={styles.panelContent}>
            {/* 测试用例选择 */}
            <div class={styles.testCaseSection}>
              <div class={styles.testCaseLabel}>测试用例</div>
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
            <div class={styles.buttonGroup}>
              <ElButton
                type="primary"
                size="small"
                icon={VideoPlay}
                onClick={runTest}
                disabled={props.isRunning || !currentTestCase.value}
                class={styles.runButton}
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
              <div class={styles.progressSection}>
                <ElProgress
                  percentage={props.progress}
                  status={props.progress === 100 ? "success" : undefined}
                  stroke-width={6}
                />
                <div class={styles.progressText}>{props.progressText}</div>
              </div>
            )}

            {/* 测试结果 */}
            {Object.keys(props.testResults).length > 0 && (
              <div class={styles.resultsSection}>
                <ElDivider content-position="left" style={{ fontSize: "12px" }}>
                  测试结果
                </ElDivider>
                <div>
                  {Object.entries(props.testResults).map(([key, value]) => (
                    <div key={key} class={styles.resultItem}>
                      <span class={styles.resultLabel}>{key}:</span>{" "}
                      <span
                        class={`${styles.resultStatus} ${
                          value ? styles.success : styles.error
                        }`}
                      >
                        {value ? "通过" : "失败"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 执行日志 */}
            {props.logs.length > 0 && (
              <div class={styles.logsSection}>
                <ElDivider content-position="left" style={{ fontSize: "12px" }}>
                  执行日志
                </ElDivider>
                <div class={styles.logContainer}>
                  {props.logs.map((log, index) => (
                    <div key={index} class={styles.logItem}>
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
