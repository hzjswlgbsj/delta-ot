// 包裹一个 editor + 状态展示（user、ack、delta）
import { defineComponent, onMounted, ref, reactive, watch } from "vue";
import IframeMessageManager from "../../utils/IframeMessageManager";
import { TestExecutor, createTestExecutor } from "../../collab/TestExecutor";
import FloatingTestPanel from "../FloatingTestPanel";
import {
  ElCard,
  ElSelect,
  ElOption,
  ElButton,
  ElProgress,
  ElAlert,
  ElDivider,
  ElTag,
  ElSpace,
} from "element-plus";
import {
  VideoPlay,
  VideoPause,
  Refresh,
  Setting,
} from "@element-plus/icons-vue";
import { testCaseConfig } from "../../constants/testCaseConfig";
import styles from "./style.module.less";

export default defineComponent({
  name: "TestPage",
  components: {
    FloatingTestPanel,
    ElCard,
    ElSelect,
    ElOption,
    ElButton,
    ElProgress,
    ElAlert,
    ElDivider,
    ElTag,
    ElSpace,
    VideoPlay,
    VideoPause,
    Refresh,
    Setting,
  },
  setup() {
    // 状态管理
    const state = reactive({
      currentTestCase: "",
      isRunning: false,
      progress: 0,
      progressText: "",
      testResults: {} as Record<string, any>,
      logs: [] as string[],
      iframeManagers: [] as IframeMessageManager[],
      testExecutor: null as TestExecutor | null,
    });

    // 从localStorage恢复状态
    const loadSavedTestCase = () => {
      const savedTestCase = localStorage.getItem("currentTestCase");
      if (
        savedTestCase &&
        testCaseConfig[savedTestCase as keyof typeof testCaseConfig]
      ) {
        state.currentTestCase = savedTestCase;
      }
    };

    // 保存当前测试用例
    const saveCurrentTestCase = (testCase: string) => {
      localStorage.setItem("currentTestCase", testCase);
    };

    // 确保测试结果对象存在
    const ensureTestResults = () => {
      if (!state.testResults) {
        state.testResults = {};
      }
    };

    // 创建iframe
    const createIframes = (count: number) => {
      // 实现iframe创建逻辑
    };

    // 初始化消息管理器
    const initMessageManagers = () => {
      // 实现消息管理器初始化逻辑
    };

    // 运行测试用例
    const runTestCase = async (testCaseName: string) => {
      if (!testCaseName || state.isRunning) return;

      const testCase =
        testCaseConfig[testCaseName as keyof typeof testCaseConfig];
      if (!testCase) {
        addProgressMessage(`❌ 测试用例 "${testCaseName}" 不存在`);
        return;
      }

      state.isRunning = true;
      state.progress = 0;
      state.progressText = "正在初始化测试...";
      state.logs = [];
      state.testResults = {};

      try {
        // 创建测试执行器
        const executor = createTestExecutor(testCase);
        state.testExecutor = executor;

        // 执行测试
        await executor.run({
          onProgress: (progress, text) => {
            state.progress = progress;
            state.progressText = text;
          },
          onLog: (message) => {
            addProgressMessage(message);
          },
          onResult: (results) => {
            state.testResults = { ...state.testResults, ...results };
          },
        });

        state.progress = 100;
        state.progressText = "测试完成";
        addProgressMessage("✅ 测试执行完成");
      } catch (error) {
        console.error("测试执行失败:", error);
        addProgressMessage(`❌ 测试执行失败: ${error}`);
        state.progressText = "测试执行失败";
      } finally {
        state.isRunning = false;
      }
    };

    // 添加进度消息
    const addProgressMessage = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      state.logs.push(`[${timestamp}] ${message}`);
      // 限制日志数量
      if (state.logs.length > 100) {
        state.logs = state.logs.slice(-100);
      }
    };

    // 停止测试
    const stopTest = () => {
      if (state.testExecutor) {
        state.testExecutor.stop();
      }
      state.isRunning = false;
      state.progressText = "测试已停止";
      addProgressMessage("⏹️ 测试已停止");
    };

    // 重置测试
    const resetTest = () => {
      state.isRunning = false;
      state.progress = 0;
      state.progressText = "";
      state.logs = [];
      state.testResults = {};
      if (state.testExecutor) {
        state.testExecutor.stop();
        state.testExecutor = null;
      }
    };

    // 处理测试用例变更
    const handleTestCaseChange = (testCase: any) => {
      state.currentTestCase = testCase.name;
      saveCurrentTestCase(testCase.name);
    };

    // 处理运行测试
    const handleRunTest = (testCaseName: string) => {
      runTestCase(testCaseName);
    };

    // 处理停止测试
    const handleStopTest = () => {
      stopTest();
    };

    // 处理重置测试
    const handleResetTest = () => {
      resetTest();
    };

    onMounted(() => {
      loadSavedTestCase();
    });

    return () => (
      <div class={styles.testPage}>
        {/* 页面头部 */}
        <div class={styles.header}>
          <h1 class={styles.title}>🧪 协同编辑测试实验室</h1>
          <p class={styles.subtitle}>测试各种协同编辑场景和冲突解决机制</p>
        </div>

        {/* 悬浮测试面板 */}
        <FloatingTestPanel
          onTestCaseChange={handleTestCaseChange}
          onRunTest={handleRunTest}
          onStopTest={handleStopTest}
          onResetTest={handleResetTest}
          isRunning={state.isRunning}
          progress={state.progress}
          progressText={state.progressText}
          testResults={state.testResults}
          logs={state.logs}
        />

        {/* 主要内容区域 */}
        <div class={styles.content}>
          {/* 编辑器区域 */}
          <div class={styles.editorSection}>
            <h3 class={styles.sectionTitle}>📝 编辑器实例</h3>
            <div class={styles.iframeContainer}>
              <iframe
                src="/document?clientId=1"
                class={styles.iframe}
                title="Editor Instance 1"
              />
            </div>
          </div>

          {/* 状态区域 */}
          <div class={styles.statusSection}>
            <h3 class={styles.sectionTitle}>📊 测试状态</h3>
            <div class={styles.statusItem}>
              <span class={styles.statusLabel}>运行状态</span>
              <span
                class={`${styles.statusValue} ${
                  state.isRunning ? styles.warning : styles.success
                }`}
              >
                {state.isRunning ? "运行中" : "空闲"}
              </span>
            </div>
            <div class={styles.statusItem}>
              <span class={styles.statusLabel}>当前测试</span>
              <span class={styles.statusValue}>
                {state.currentTestCase || "未选择"}
              </span>
            </div>
            <div class={styles.statusItem}>
              <span class={styles.statusLabel}>进度</span>
              <span class={styles.statusValue}>{state.progress}%</span>
            </div>
          </div>
        </div>

        {/* 日志区域 */}
        <div class={styles.logSection}>
          <h3 class={styles.sectionTitle}>📋 执行日志</h3>
          <div class={styles.logContainer}>
            {state.logs.length === 0 ? (
              <div class={styles.logItem}>暂无日志</div>
            ) : (
              state.logs.map((log, index) => (
                <div key={index} class={styles.logItem}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  },
});
