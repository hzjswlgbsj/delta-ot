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
    const loading = ref(false);
    const { user, documentId, update } = props;

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

    return () => (
      <div class="border rounded p-3 shadow bg-white">
        <div class="text-sm font-semibold mb-2">
          👤 {user.userName} ({user.userId})
        </div>
        {editorValue.value && (
          <Editor
            value={editorValue.value}
            updates={latestUpdate.value}
            onChange={handleChange}
          />
        )}
      </div>
    );
  },
});
