import IframeMessageManager from "../utils/IframeMessageManager";
import { TestCase } from "./testCases";

export interface TestExecutionConfig {
  testCase: TestCase[];
  messageManagers: IframeMessageManager[];
  clientConfigs: any[];
  onProgress?: (message: string) => void;
  onComplete?: (results: any) => void;
  onError?: (error: string) => void;
}

export class TestExecutor {
  private config: TestExecutionConfig;
  private isRunning: boolean = false;
  private operationQueue: Array<{
    operation: any;
    clientIndex: number;
    delay: number;
  }> = [];

  constructor(config: TestExecutionConfig) {
    this.config = config;
  }

  /**
   * 执行测试用例
   */
  async execute(): Promise<void> {
    if (this.isRunning) {
      throw new Error("测试已在运行中");
    }

    this.isRunning = true;
    this.config.onProgress?.("开始执行测试用例");

    try {
      // 1. 准备操作队列
      this.prepareOperationQueue();

      // 2. 按时间顺序执行操作
      await this.executeOperations();

      // 3. 等待所有操作完成
      await this.waitForCompletion();

      this.config.onProgress?.("测试用例执行完成");
      this.config.onComplete?.({ success: true, message: "测试完成" });
    } catch (error) {
      this.config.onError?.(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 准备操作队列
   */
  private prepareOperationQueue(): void {
    this.operationQueue = [];

    console.log("准备操作队列，测试用例:", this.config.testCase);
    console.log("客户端配置:", this.config.clientConfigs);
    console.log("消息管理器数量:", this.config.messageManagers.length);

    for (const operation of this.config.testCase) {
      const clientIndex = this.config.clientConfigs.findIndex(
        (config) => config.userId === operation.userId
      );

      console.log(
        `操作 ${operation.description}: 用户ID ${operation.userId}, 客户端索引 ${clientIndex}`
      );

      if (
        clientIndex >= 0 &&
        clientIndex < this.config.messageManagers.length
      ) {
        this.operationQueue.push({
          operation,
          clientIndex,
          delay: operation.delay,
        });
        console.log(`✓ 操作已添加到队列`);
      } else {
        // 记录找不到匹配客户端的情况
        this.config.onProgress?.(
          `警告: 找不到用户 ${operation.userId} 对应的客户端配置`
        );
        console.warn(`找不到用户 ${operation.userId} 对应的客户端配置`);
      }
    }

    // 按延迟时间排序
    this.operationQueue.sort((a, b) => a.delay - b.delay);

    this.config.onProgress?.(`准备执行 ${this.operationQueue.length} 个操作`);

    // 如果队列为空，抛出错误
    if (this.operationQueue.length === 0) {
      throw new Error("没有找到任何可执行的操作，请检查客户端配置和用户ID匹配");
    }
  }

  /**
   * 执行操作队列
   */
  private async executeOperations(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const { operation, clientIndex, delay } of this.operationQueue) {
      const promise = new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!this.isRunning) {
            resolve();
            return;
          }

          try {
            const messageManager = this.config.messageManagers[clientIndex];

            if (!messageManager) {
              throw new Error(`消息管理器不存在，客户端索引: ${clientIndex}`);
            }

            console.log(`准备发送操作到客户端 ${clientIndex + 1}:`, {
              ops: operation.ops,
              description: operation.description,
              userId: operation.userId,
            });

            // 发送操作数据 - 确保数据可以被序列化
            const messageData = {
              ops: JSON.parse(JSON.stringify(operation.ops)), // 深度克隆数组
              description: operation.description,
              userId: operation.userId,
            };

            messageManager.send(messageData);

            this.config.onProgress?.(
              `执行操作: ${operation.description} (客户端 ${
                clientIndex + 1
              }, 延迟 ${delay}ms)`
            );
          } catch (error) {
            console.error(`执行操作失败: ${operation.description}`, error);
            this.config.onError?.(
              `执行操作失败: ${operation.description} - ${error}`
            );
          }

          resolve();
        }, delay);
      });

      promises.push(promise);
    }

    await Promise.all(promises);
  }

  /**
   * 等待所有操作完成
   */
  private async waitForCompletion(): Promise<void> {
    const maxDelay = Math.max(...this.config.testCase.map((op) => op.delay));
    const waitTime = maxDelay + 2000; // 额外等待2秒确保所有操作完成

    this.config.onProgress?.(`等待 ${waitTime}ms 确保所有操作完成`);

    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  /**
   * 停止测试执行
   */
  stop(): void {
    this.isRunning = false;
    this.config.onProgress?.("测试执行已停止");
  }

  /**
   * 检查是否正在运行
   */
  isExecuting(): boolean {
    return this.isRunning;
  }

  /**
   * 获取操作队列信息
   */
  getOperationQueueInfo(): {
    total: number;
    executed: number;
    remaining: number;
  } {
    return {
      total: this.operationQueue.length,
      executed: 0, // 这里可以添加执行计数逻辑
      remaining: this.operationQueue.length,
    };
  }
}

/**
 * 创建测试执行器
 */
export function createTestExecutor(config: TestExecutionConfig): TestExecutor {
  return new TestExecutor(config);
}

/**
 * 批量执行多个测试用例
 */
export async function executeTestSuite(
  testCases: Record<string, TestCase[]>,
  messageManagers: IframeMessageManager[],
  clientConfigs: any[],
  onProgress?: (testName: string, message: string) => void,
  onComplete?: (results: Record<string, any>) => void
): Promise<void> {
  const results: Record<string, any> = {};

  for (const [testName, testCase] of Object.entries(testCases)) {
    onProgress?.(testName, `开始执行测试用例: ${testName}`);

    const executor = createTestExecutor({
      testCase,
      messageManagers,
      clientConfigs,
      onProgress: (message) => onProgress?.(testName, message),
      onError: (error) => {
        results[testName] = { success: false, error };
        onProgress?.(testName, `测试失败: ${error}`);
      },
    });

    try {
      await executor.execute();
      results[testName] = { success: true };
      onProgress?.(testName, `测试用例 ${testName} 执行完成`);
    } catch (error) {
      results[testName] = { success: false, error };
      onProgress?.(testName, `测试用例 ${testName} 执行失败`);
    }

    // 测试用例之间的间隔
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  onComplete?.(results);
}
