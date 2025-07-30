import { defineComponent, onMounted, ref } from "vue";
import { DocumentManager } from "../../controllers/DocumentManager";
import { Editor } from "@/components";
import styles from "./style.module.less";
import { useRoute, useRouter } from "vue-router";
import Delta from "quill-delta";
import { getFileInfo } from "@/services/file";
import { safeJsonParse } from "@/utils";
import { getUserInfo } from "@/services/user";
import { useUserStore } from "@/store/useUserStore";
import type { CursorInfo } from "@delta-ot/collaborate";

export default defineComponent({
  name: "Document",
  components: {
    Editor,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const editorValue = ref<Delta>(null);
    const latestUpdate = ref<Delta>(null);
    const loading = ref(false);
    const currentUser = ref<any>(null);
    const editorRef = ref<any>(null);
    let docManager: DocumentManager;
    const userStore = useUserStore();

    const getUser = async () => {
      try {
        const res = await getUserInfo();
        if (res.code === 0 && res.data) {
          userStore.setUser(res.data);
          return res.data; // 返回用户信息
        } else {
          console.warn("获取用户信息失败:", res.msg);
          // 如果获取用户信息失败，尝试从localStorage恢复
          const restoredUser = userStore.restoreUser();
          if (!restoredUser) {
            // 如果localStorage中也没有用户信息，重定向到登录页
            router.push("/login");
            return null;
          }
          return restoredUser; // 返回恢复的用户信息
        }
      } catch (error) {
        console.error("获取用户信息出错:", error);
        // 尝试从localStorage恢复
        const restoredUser = userStore.restoreUser();
        if (!restoredUser) {
          // 如果localStorage中也没有用户信息，重定向到登录页
          router.push("/login");
          return null;
        }
        return restoredUser; // 返回恢复的用户信息
      }
    };

    const getDocument = async () => {
      const guid = route.params.guid as string;
      if (guid) {
        const res = await getFileInfo(guid);
        if (res.code === 0) {
          return res.data;
        } else {
          throw new Error(res.msg || "获取文档失败");
        }
      }
    };

    const handleLocalChange = (delta: Delta) => {
      if (docManager) {
        docManager.commitDelta(delta);
      }
    };

    const handleEditorReady = (quill: any) => {
      // 不要直接设置 quillInstance，而是通过 editorRef 来访问 Editor 组件
    };

    // 处理编辑器选区变化
    const handleSelectionChange = (
      range: { index: number; length: number } | null
    ) => {
      if (range && currentUser.value) {
        // 发送光标更新消息
        const cursorData = {
          index: range.index,
          length: range.length,
          userName: currentUser.value.userName,
          color: "#4CAF50",
          status: "active" as const,
          lastActivity: Date.now(),
        };
        docManager.sendCursorMessage(cursorData);

        // 直接显示本地光标
        if (editorRef.value) {
          const localCursorData = {
            userId: currentUser.value.userId,
            userName: currentUser.value.userName,
            color: "#4CAF50", // 使用绿色来测试
            index: range.index,
            length: range.length, // 添加 length 字段
            status: "active" as const, // 活跃状态
            lastActivity: Date.now(),
          };
          editorRef.value.updateLocalCursor(localCursorData);
        }
      }
    };

    // 处理编辑器焦点变化
    const handleEditorFocus = () => {
      if (currentUser.value && editorRef.value) {
        // 获得焦点时，发送活跃状态
        const localCursorData = {
          userId: currentUser.value.userId,
          userName: currentUser.value.userName,
          color: "#4CAF50",
          index: 0, // 暂时设为0，后续会根据实际光标位置更新
          status: "active" as const,
          lastActivity: Date.now(),
        };
        docManager.sendCursorMessage(localCursorData);
        editorRef.value.updateLocalCursor(localCursorData);
      }
    };

    const handleEditorBlur = () => {
      if (currentUser.value && editorRef.value) {
        // 失去焦点时，发送空闲状态
        const localCursorData = {
          userId: currentUser.value.userId,
          userName: currentUser.value.userName,
          color: "#4CAF50",
          index: 0,
          status: "idle" as const,
          lastActivity: Date.now(),
        };
        docManager.sendCursorMessage(localCursorData);
        editorRef.value.updateLocalCursor(localCursorData);
      }
    };

    onMounted(async () => {
      loading.value = true;
      try {
        // 确保用户信息加载成功
        const userInfo = await getUser();
        if (!userInfo) {
          // 如果用户信息加载失败，已经重定向到登录页，这里直接返回
          return;
        }

        // 设置当前用户信息
        currentUser.value = {
          userId: userInfo.userId,
          userName: userInfo.userName,
          avatar: userInfo.avatar,
        };

        const fileInfo = await getDocument();
        const initialDelta = fileInfo.content
          ? new Delta(safeJsonParse(fileInfo.content))
          : null;

        editorValue.value = initialDelta;

        docManager = new DocumentManager();

        // 直接使用获取到的用户信息
        await docManager.setup(fileInfo.guid, userInfo, initialDelta);

        // 使用 DocumentManager 中封装的监听器
        docManager.onRemoteDelta((delta) => {
          latestUpdate.value = delta;
        });

        // 设置光标更新回调
        docManager.onCursorUpdate((cursor: CursorInfo) => {
          if (editorRef.value) {
            // 使用 SimpleCursorManager 更新光标（包括本地和远程）
            const cursorData = {
              userId: cursor.userId,
              userName: cursor.userName,
              color: cursor.color,
              index: cursor.index,
              length: cursor.length, // 添加 length 字段
              status: cursor.status,
              lastActivity: cursor.lastActivity,
            };
            editorRef.value.updateRemoteCursor(cursorData);
          }
        });
      } catch (error) {
        console.error("初始化文档失败:", error);
        // 如果是用户信息问题，重定向到登录页
        if (error.message.includes("用户信息不存在")) {
          router.push("/login");
        }
      } finally {
        loading.value = false;
      }
    });

    return () => (
      <div class={styles.documentWrapper}>
        {loading.value && <div class={styles.loading}>Loading...</div>}

        <Editor
          ref={editorRef}
          v-show={!loading.value}
          value={editorValue.value}
          updates={latestUpdate.value}
          onChange={handleLocalChange}
          onReady={handleEditorReady}
          onSelectionChange={handleSelectionChange}
          onFocus={handleEditorFocus}
          onBlur={handleEditorBlur}
        />
      </div>
    );
  },
});
