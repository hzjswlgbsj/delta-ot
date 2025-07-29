// 包裹一个 editor + 状态展示（user、ack、delta）
import { defineComponent, onMounted, PropType, ref, watch } from "vue";
import { Editor } from "@/components";
import { DocumentManager } from "@/controllers/DocumentManager";
import Delta, { Op } from "quill-delta";
import { getFileInfo } from "@/services/file";
import { safeJsonParse } from "@/utils";
import { UserInfo } from "@/types/base";

export default defineComponent({
  props: {
    user: {
      type: Object as PropType<UserInfo>,
      required: true,
    },
    documentId: {
      type: String,
      required: true,
    },
    update: {
      type: Array as PropType<Op[]>,
      required: true,
    },
  },
  setup(props) {
    const editorValue = ref<Delta | null>(null);
    const latestUpdate = ref<Delta | null>(null);
    const manager = ref<DocumentManager | null>(null);
    const editorRef = ref<any>(null);
    const loading = ref(false);
    const { user, documentId, update } = props;

    // 根据 clientId 确定颜色
    const getUserColor = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const clientId = urlParams.get("clientId");

      const colorMap: Record<string, string> = {
        "1": "#3B82F6", // 蓝色
        "2": "#10B981", // 绿色
        "3": "#EF4444", // 红色
      };

      return colorMap[clientId || "1"] || "#3B82F6";
    };

    const initDocument = async () => {
      loading.value = true;

      const res = await getFileInfo(documentId);
      const initial =
        res.code === 0
          ? new Delta(safeJsonParse(res.data.content))
          : new Delta();
      editorValue.value = initial;

      const docManager = new DocumentManager();
      docManager.setup(documentId, user, initial);
      // 使用 DocumentManager 中封装的监听器
      docManager.onRemoteDelta((delta) => {
        latestUpdate.value = delta;
      });
      // 添加光标消息处理
      docManager.onCursorUpdate((cursorData) => {
        // 处理远程光标更新
        if (editorRef.value) {
          editorRef.value.updateRemoteCursor(cursorData);
        }
      });
      manager.value = docManager;
      loading.value = false;
    };

    onMounted(initDocument);
    watch(() => documentId, initDocument);

    watch(
      () => update,
      (ops) => {
        if (ops) {
          const delta = new Delta(ops);
          latestUpdate.value = delta;
          manager.value?.commitDelta(delta);
        }
      },
      {
        deep: true,
      }
    );

    const handleChange = (delta: Delta) => {
      manager.value?.commitDelta(delta);
    };

    // 处理编辑器选区变化
    const handleSelectionChange = (
      range: { index: number; length: number } | null
    ) => {
      if (range && user) {
        const userColor = getUserColor();
        // 发送光标更新消息
        const cursorData = {
          index: range.index,
          length: range.length,
          userName: user.userName,
          color: userColor,
          status: "active" as const,
          lastActivity: Date.now(),
        };
        manager.value?.sendCursorMessage(cursorData);

        // 直接显示本地光标
        if (editorRef.value) {
          const localCursorData = {
            userId: user.userId,
            userName: user.userName,
            color: userColor,
            index: range.index,
            status: "active" as const, // 活跃状态
            lastActivity: Date.now(),
          };
          editorRef.value.updateRemoteCursor(localCursorData);
        }
      }
    };

    // 处理编辑器焦点变化
    const handleEditorFocus = () => {
      if (user && manager.value) {
        const userColor = getUserColor();
        // 获得焦点时，发送活跃状态
        const cursorData = {
          index: 0, // 暂时设为0，后续会根据实际光标位置更新
          length: 0,
          userName: user.userName,
          color: userColor,
          status: "active" as const,
          lastActivity: Date.now(),
        };
        manager.value.sendCursorMessage(cursorData);

        // 直接显示本地光标
        if (editorRef.value) {
          const localCursorData = {
            userId: user.userId,
            userName: user.userName,
            color: userColor,
            index: 0,
            status: "active" as const,
            lastActivity: Date.now(),
          };
          editorRef.value.updateRemoteCursor(localCursorData);
        }
      }
    };

    const handleEditorBlur = () => {
      if (user && manager.value) {
        const userColor = getUserColor();
        // 失去焦点时，发送空闲状态
        const cursorData = {
          index: 0,
          length: 0,
          userName: user.userName,
          color: userColor,
          status: "idle" as const,
          lastActivity: Date.now(),
        };
        manager.value.sendCursorMessage(cursorData);

        // 直接显示本地光标
        if (editorRef.value) {
          const localCursorData = {
            userId: user.userId,
            userName: user.userName,
            color: userColor,
            index: 0,
            status: "idle" as const,
            lastActivity: Date.now(),
          };
          editorRef.value.updateRemoteCursor(localCursorData);
        }
      }
    };

    return () => (
      <div class="border rounded p-3 shadow bg-white">
        <div class="text-sm font-semibold mb-2">
          👤 {user.userName} ({user.userId})
        </div>
        {editorValue.value && (
          <Editor
            ref={editorRef}
            value={editorValue.value}
            updates={latestUpdate.value}
            onChange={handleChange}
            onSelectionChange={handleSelectionChange}
            onFocus={handleEditorFocus}
            onBlur={handleEditorBlur}
          />
        )}
      </div>
    );
  },
});
