import { defineComponent, onMounted, ref } from "vue";
import { DocumentManager } from "../../controllers/DocumentManager";
import { Editor } from "@/components";
import styles from "./style.module.less";
import { useRoute } from "vue-router";
import Delta from "quill-delta";
import { getFileInfo } from "@/services/file";
import { safeJsonParse } from "@/utils";
import { getUserInfo } from "@/services/user";
import { useUserStore } from "@/store/useUserStore";

export default defineComponent({
  setup() {
    const route = useRoute();
    const editorValue = ref<Delta>(null);
    const latestUpdate = ref<Delta>(null);
    const loading = ref(false);
    let docManager: DocumentManager;
    const store = useUserStore();

    const getUser = async () => {
      const res = await getUserInfo();
      if (res.code === 0) {
        store.setUser(res.data);
      } else {
        throw new Error(res.msg || "获取用户失败");
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
      docManager.commitDelta(delta);
    };

    onMounted(async () => {
      loading.value = true;
      await getUser();
      const fileInfo = await getDocument();
      const initialDelta = fileInfo.content
        ? new Delta(safeJsonParse(fileInfo.content))
        : null;

      editorValue.value = initialDelta;

      docManager = new DocumentManager();
      docManager.setup(fileInfo.guid, initialDelta);

      // 使用 DocumentManager 中封装的监听器
      docManager.onRemoteDelta((delta) => {
        latestUpdate.value = delta;
      });
      loading.value = false;
    });

    return () => (
      <div class={styles.documentWrapper}>
        {loading.value && <div class={styles.loading}>Loading...</div>}

        <Editor
          v-show={!loading.value}
          value={editorValue.value}
          updates={latestUpdate.value}
          onChange={handleLocalChange}
        />
      </div>
    );
  },
});
