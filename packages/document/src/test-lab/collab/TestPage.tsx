// 包裹一个 editor + 状态展示（user、ack、delta）
import { defineComponent, onMounted, ref, reactive, watch } from "vue";
import IframeMessageManager from "../utils/IframeMessageManager";
import { TestExecutor, createTestExecutor } from "./TestExecutor";
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
  InfoFilled,
} from "@element-plus/icons-vue";
import {
  basicInsertConflict,
  insertAtDifferentPositions,
  concurrentDeleteAndInsert,
  formatConflict,
  deleteConflict,
  samePositionDeleteConflict,
  complexInsertConflict,
  insertAndDeleteOverlap,
  formatAndContentConflict,
  multipleFormatConflict,
  attributeConflictStrategy,
  sequentialOperations,
  boundaryOperations,
  largeTextOperations,
  formatRemovalConflict,
  mixedOperations,
  // 新增的测试用例
  networkLatencySimulation,
  multipleUserConflict,
  rapidSuccessiveOperations,
  rapidSuccessiveOperationsAdvanced,
  extremeRapidSuccessiveOperations,
  complexFormatMerging,
  partialFormatConflict,
  insertWithFormatConflict,
  deleteAcrossFormattedText,
  retainZeroEdgeCases,
  emptyDocumentOperations,
  longTextWithFormatting,
  formatRemovalAndAddition,
  stressTest,
  realWorldScenario,
  edgeCaseOperations,
  formatInheritanceTest,
  concurrentFormatRemoval,
  query1,
  query2,
} from "./testCases";
import { simpleTest, simpleTwoUserTest } from "./simpleTest";

// 测试用例配置
const testCases = {
  simpleTest,
  simpleTwoUserTest,
  basicInsertConflict,
  insertAtDifferentPositions,
  concurrentDeleteAndInsert,
  formatConflict,
  deleteConflict,
  samePositionDeleteConflict,
  complexInsertConflict,
  insertAndDeleteOverlap,
  formatAndContentConflict,
  multipleFormatConflict,
  attributeConflictStrategy,
  sequentialOperations,
  boundaryOperations,
  largeTextOperations,
  formatRemovalConflict,
  mixedOperations,
  networkLatencySimulation,
  multipleUserConflict,
  rapidSuccessiveOperations,
  rapidSuccessiveOperationsAdvanced,
  extremeRapidSuccessiveOperations,
  complexFormatMerging,
  partialFormatConflict,
  insertWithFormatConflict,
  deleteAcrossFormattedText,
  retainZeroEdgeCases,
  emptyDocumentOperations,
  longTextWithFormatting,
  formatRemovalAndAddition,
  stressTest,
  realWorldScenario,
  edgeCaseOperations,
  formatInheritanceTest,
  concurrentFormatRemoval,
};

// 客户端配置
const clientConfigs = [
  {
    id: "1",
    query: query1,
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    color: "blue",
  },
  {
    id: "2",
    query: query2,
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    color: "green",
  },
  {
    id: "3",
    query: new URLSearchParams({
      loginName: "zhangsan",
      pwd: "000000",
      docId: "9089d075-6604-41f6-a4fa-4d466c60f4c4",
      clientId: "3",
    }).toString(),
    userId: "9c8b7a6d-5e4f-3g2h-1i0j-k1l2m3n4o5p6",
    color: "red",
  },
];

export default defineComponent({
  setup() {
    const iframes = ref<(HTMLIFrameElement | null)[]>([]);
    const messageManagers = ref<IframeMessageManager[]>([]);
    const currentTestCase = ref<string>("simpleTest");
    const isRunning = ref<boolean>(false);
    const testResults = ref<Record<string, any>>({});
    const testExecutor = ref<TestExecutor | null>(null);
    const progressMessages = ref<string[]>([]);

    // localStorage 缓存相关
    const STORAGE_KEY = "collab-test-current-case";

    // 从localStorage加载上次选择的测试用例
    const loadSavedTestCase = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && testCases[saved as keyof typeof testCases]) {
          currentTestCase.value = saved;
          console.log("从localStorage加载测试用例:", saved);
        }
      } catch (error) {
        console.warn("加载localStorage失败:", error);
      }
    };

    // 保存当前选择的测试用例到localStorage
    const saveCurrentTestCase = (testCase: string) => {
      try {
        localStorage.setItem(STORAGE_KEY, testCase);
      } catch (error) {
        console.warn("保存到localStorage失败:", error);
      }
    };

    // 监听测试用例变化，自动保存
    watch(currentTestCase, (newValue) => {
      saveCurrentTestCase(newValue);
    });

    // 确保testResults总是被初始化
    const ensureTestResults = () => {
      if (!testResults.value) {
        console.warn("testResults未初始化，重新初始化");
        testResults.value = {};
      }
    };

    // 创建指定数量的iframe
    const createIframes = (count: number) => {
      iframes.value = Array(count).fill(null);
    };

    // 初始化消息管理器
    const initMessageManagers = () => {
      console.log("初始化消息管理器，iframe数量:", iframes.value.length);

      messageManagers.value = iframes.value
        .filter((iframe) => {
          const hasWindow = iframe?.contentWindow;
          console.log("iframe contentWindow:", hasWindow);
          return hasWindow;
        })
        .map((iframe) => {
          console.log("创建消息管理器，targetWindow:", iframe!.contentWindow);
          return new IframeMessageManager(iframe!.contentWindow!);
        });

      console.log("创建的消息管理器数量:", messageManagers.value.length);
    };

    // 执行测试用例
    const runTestCase = async (testCaseName: string) => {
      const testCase = testCases[testCaseName as keyof typeof testCases];
      if (!testCase) {
        console.error(`测试用例 ${testCaseName} 不存在`);
        return;
      }

      // 停止当前测试
      if (testExecutor.value) {
        testExecutor.value.stop();
      }

      isRunning.value = true;
      progressMessages.value = [];
      ensureTestResults(); // 确保testResults被初始化

      console.log(`开始执行测试用例: ${testCaseName}`);
      addProgressMessage(`开始执行测试用例: ${testCaseName}`);

      try {
        // 根据测试用例确定需要的客户端数量
        const userIds = [...new Set(testCase.map((op) => op.userId))];
        const requiredClients =
          Math.max(
            ...userIds.map((userId) =>
              clientConfigs.findIndex((config) => config.userId === userId)
            )
          ) + 1;

        console.log("测试用例用户ID:", userIds);
        console.log("需要的客户端数量:", requiredClients);

        // 创建足够的iframe
        createIframes(requiredClients);
        console.log(`创建了 ${requiredClients} 个iframe`);

        // 等待iframe加载完成
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // 检查iframe是否加载完成
        const loadedIframes = iframes.value.filter(
          (iframe) => iframe?.contentWindow
        );
        console.log("已加载的iframe数量:", loadedIframes.length);

        if (loadedIframes.length === 0) {
          throw new Error("iframe加载失败，请检查网络连接");
        }

        if (loadedIframes.length < requiredClients) {
          console.warn(
            `警告: 只加载了 ${loadedIframes.length} 个iframe，需要 ${requiredClients} 个`
          );
        }

        // 初始化消息管理器
        initMessageManagers();

        console.log("客户端配置:", clientConfigs);
        console.log("消息管理器数量:", messageManagers.value.length);
        console.log("测试用例:", testCase);

        // 创建测试执行器
        testExecutor.value = createTestExecutor({
          testCase,
          messageManagers: messageManagers.value as any,
          clientConfigs,
          onProgress: (message) => {
            console.log(message);
            addProgressMessage(message);
          },
          onComplete: (results) => {
            console.log("测试完成:", results);
            addProgressMessage("测试用例执行完成");
            try {
              testResults.value[testCaseName] = results;
            } catch (e) {
              console.error("设置测试结果失败:", e);
            }
            isRunning.value = false;
          },
          onError: (error) => {
            console.error("测试错误:", error);
            addProgressMessage(`测试错误: ${error}`);
            try {
              testResults.value[testCaseName] = { success: false, error };
            } catch (e) {
              console.error("设置测试结果失败:", e);
            }
            isRunning.value = false;
          },
        });

        // 执行测试
        await testExecutor.value.execute();
      } catch (error) {
        console.error("测试执行失败:", error);
        addProgressMessage(`测试执行失败: ${error}`);
        isRunning.value = false;
      }
    };

    // 添加进度消息
    const addProgressMessage = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      progressMessages.value.push(`[${timestamp}] ${message}`);

      // 保持最多50条消息
      if (progressMessages.value.length > 50) {
        progressMessages.value = progressMessages.value.slice(-50);
      }
    };

    // 停止当前测试
    const stopTest = () => {
      if (testExecutor.value) {
        testExecutor.value.stop();
      }
      isRunning.value = false;
      messageManagers.value.forEach((manager) => manager.destroy());
      messageManagers.value = [];
    };

    // 重置测试
    const resetTest = () => {
      stopTest();
      iframes.value = [];
      try {
        testResults.value = {};
      } catch (e) {
        console.error("重置测试结果失败:", e);
        testResults.value = {};
      }
    };

    onMounted(() => {
      // 加载保存的测试用例
      loadSavedTestCase();

      // 默认创建2个客户端
      createIframes(2);
    });

    return () => (
      <div class="p-6 bg-gray-50 min-h-screen">
        {/* 控制面板 */}
        <ElCard
          class="mb-6"
          shadow="hover"
          v-slots={{
            header: () => (
              <div class="flex items-center">
                <Setting class="mr-2" style="width: 16px; height: 16px;" />
                <span class="font-semibold">测试控制面板</span>
              </div>
            ),
          }}
        >
          <ElSpace direction="vertical" size="large" class="w-full">
            {/* 测试用例选择 */}
            <div class="flex items-center gap-4">
              <label class="text-sm font-medium text-gray-700 min-w-20">
                测试用例:
              </label>
              <ElSelect
                v-model={currentTestCase.value}
                placeholder="选择测试用例"
                disabled={isRunning.value}
                class="flex-1 max-w-md"
                popper-class="test-case-select-dropdown"
                filterable
              >
                {Object.keys(testCases).map((name) => (
                  <ElOption key={name} label={name} value={name} />
                ))}
              </ElSelect>
            </div>

            {/* 测试用例描述 */}
            <ElAlert
              title={
                currentCases[currentTestCase.value]?.description ||
                currentTestCase.value
              }
              type="info"
              show-icon
              closable={false}
            />

            {/* 操作按钮 */}
            <div class="flex gap-3">
              <ElButton
                type="primary"
                icon={VideoPlay}
                onClick={() => runTestCase(currentTestCase.value)}
                disabled={isRunning.value}
                loading={isRunning.value}
                class="flex items-center"
                style="--el-button-icon-size: 14px;"
              >
                {isRunning.value ? "测试中..." : "运行测试"}
              </ElButton>

              <ElButton
                type="danger"
                icon={VideoPause}
                onClick={stopTest}
                disabled={!isRunning.value}
                class="flex items-center"
                style="--el-button-icon-size: 14px;"
              >
                停止测试
              </ElButton>

              <ElButton
                icon={Refresh}
                onClick={resetTest}
                class="flex items-center"
                style="--el-button-icon-size: 14px;"
              >
                重置
              </ElButton>

              <ElButton
                type="warning"
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
                  currentTestCase.value = "simpleTest";
                }}
                class="flex items-center"
                style="--el-button-icon-size: 14px;"
              >
                清除缓存
              </ElButton>
            </div>

            {/* 状态显示 */}
            <div class="flex items-center gap-4">
              <ElTag type={isRunning.value ? "warning" : "success"}>
                {isRunning.value ? "运行中" : "就绪"}
              </ElTag>
              <span class="text-sm text-gray-600">
                已保存到本地存储，刷新页面后自动恢复
              </span>
            </div>
          </ElSpace>
        </ElCard>

        {/* 进度消息 */}
        {progressMessages.value.length > 0 && (
          <ElCard
            class="mb-6"
            shadow="hover"
            v-slots={{
              header: () => (
                <div class="flex items-center">
                  <InfoFilled class="mr-2" style="width: 16px; height: 16px;" />
                  <span class="font-semibold">执行进度</span>
                </div>
              ),
            }}
          >
            <div class="max-h-48 overflow-y-auto bg-gray-50 rounded p-3">
              {progressMessages.value.map((message, index) => (
                <div key={index} class="mb-2 text-sm text-gray-700 font-mono">
                  {message}
                </div>
              ))}
            </div>
          </ElCard>
        )}

        {/* 客户端容器 */}
        <div class="grid gap-6">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-lg font-semibold text-gray-800">
              客户端 ({iframes.value.length})
            </span>
            <ElTag type="info">
              {iframes.value.length === 1
                ? "单用户"
                : iframes.value.length === 2
                ? "双用户"
                : "多用户"}
              测试
            </ElTag>
          </div>

          <div
            class={`grid gap-6 ${
              iframes.value.length === 1
                ? "grid-cols-1"
                : iframes.value.length === 2
                ? "grid-cols-2"
                : "grid-cols-3"
            }`}
          >
            {iframes.value.map((_, index) => {
              const config = clientConfigs[index];
              if (!config) return null;

              return (
                <ElCard
                  key={index}
                  shadow="hover"
                  class="h-full"
                  v-slots={{
                    header: () => (
                      <div class="flex items-center justify-between">
                        <span class="font-medium">客户端 {config.id}</span>
                        <ElTag
                          type="primary"
                          style={{
                            backgroundColor: config.color,
                            borderColor: config.color,
                          }}
                        >
                          {config.color}
                        </ElTag>
                      </div>
                    ),
                  }}
                >
                  <div class="h-[75vh]">
                    <iframe
                      ref={(el) =>
                        (iframes.value[index] = el as HTMLIFrameElement)
                      }
                      src={`/client-test?${config.query}`}
                      class="w-full h-full border-0 rounded"
                    />
                  </div>
                </ElCard>
              );
            })}
          </div>
        </div>
      </div>
    );
  },
});

// 测试用例描述
const currentCases = {
  simpleTest: {
    description: "简单测试 - 单用户插入操作",
  },
  simpleTwoUserTest: {
    description: "简单双用户测试 - 两个用户插入操作",
  },
  basicInsertConflict: {
    description: "Case 1: 基础插入冲突 - 两个用户在相同位置插入不同字符",
  },
  insertAtDifferentPositions: {
    description: "Case 2: 不同位置插入 - 测试非冲突情况",
  },
  concurrentDeleteAndInsert: {
    description: "Case 3: 并发删除和插入 - 测试删除/插入冲突",
  },
  formatConflict: { description: "Case 4: 格式冲突 - 测试属性合并冲突" },
  deleteConflict: { description: "Case 5: 删除冲突 - 测试删除冲突处理" },
  samePositionDeleteConflict: {
    description: "Case 5.1: 相同位置删除冲突 - 测试相同位置删除",
  },
  complexInsertConflict: {
    description: "Case 6: 复杂插入冲突 - 测试复杂插入冲突",
  },
  insertAndDeleteOverlap: {
    description: "Case 7: 插入删除重叠 - 测试插入删除重叠冲突",
  },
  formatAndContentConflict: {
    description: "Case 8: 格式内容混合冲突 - 测试格式与内容混合冲突",
  },
  multipleFormatConflict: {
    description: "Case 9: 多属性格式冲突 - 测试多属性格式冲突",
  },
  attributeConflictStrategy: {
    description: "Case 9.1: 属性冲突策略 - 测试颜色属性冲突解决",
  },
  sequentialOperations: {
    description: "Case 10: 连续操作 - 测试操作序列的正确性",
  },
  boundaryOperations: { description: "Case 11: 边界操作 - 测试边界情况" },
  largeTextOperations: {
    description: "Case 12: 大文本操作 - 测试大文本操作的性能",
  },
  formatRemovalConflict: {
    description: "Case 13: 格式移除冲突 - 测试格式移除与格式设置的冲突",
  },
  mixedOperations: {
    description: "Case 14: 混合操作 - 包含插入、删除、格式设置的混合操作",
  },
  networkLatencySimulation: {
    description: "Case 15: 网络延迟模拟 - 测试不同延迟下的冲突解决",
  },
  multipleUserConflict: {
    description: "Case 16: 多用户冲突 - 三个用户同时操作",
  },
  rapidSuccessiveOperations: {
    description:
      "Case 17: 快速连续操作 - 测试系统在高频操作下的稳定性 (修复版)",
  },
  rapidSuccessiveOperationsAdvanced: {
    description: "Case 17.5: 高级快速连续操作 - 更复杂的OT算法稳定性测试",
  },
  extremeRapidSuccessiveOperations: {
    description: "Case 17.6: 极端快速连续操作 - 强制制造相同位置冲突测试",
  },
  complexFormatMerging: {
    description: "Case 18: 复杂格式合并 - 测试多个格式属性的正确合并",
  },
  partialFormatConflict: {
    description: "Case 19: 部分格式冲突 - 测试重叠但不完全相同的格式范围",
  },
  insertWithFormatConflict: {
    description: "Case 20: 插入带格式冲突 - 插入带格式的文本与格式设置的冲突",
  },
  deleteAcrossFormattedText: {
    description: "Case 21: 删除跨越格式文本 - 删除跨越格式文本的操作",
  },
  retainZeroEdgeCases: {
    description: "Case 22: retain(0)边界情况 - 测试retain(0)的各种边界情况",
  },
  emptyDocumentOperations: {
    description: "Case 23: 空文档操作 - 空文档上的各种操作测试",
  },
  longTextWithFormatting: {
    description: "Case 24: 长文本格式操作 - 长文本与格式的混合操作",
  },
  formatRemovalAndAddition: {
    description: "Case 25: 格式移除与添加 - 格式移除与添加的冲突测试",
  },
  stressTest: { description: "Case 26: 压力测试 - 大量并发操作" },
  realWorldScenario: {
    description: "Case 27: 真实世界场景 - 模拟真实世界的编辑场景",
  },
  edgeCaseOperations: {
    description: "Case 28: 边界情况操作 - 各种边界情况的测试",
  },
  formatInheritanceTest: {
    description: "Case 29: 格式继承测试 - 测试格式继承和传播",
  },
  concurrentFormatRemoval: {
    description: "Case 30: 并发格式移除 - 并发格式移除测试",
  },
};
