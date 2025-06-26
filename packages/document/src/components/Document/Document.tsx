import { defineComponent, onMounted, ref } from "vue";
import { DocumentManager } from "../../DocumentManager";
import { Editor } from "@/components";
import styles from "./style.module.less";
import { useRoute } from "vue-router";
import Delta from "quill-delta";

export default defineComponent({
  setup() {
    const route = useRoute();
    const editorValue = ref<Delta | undefined>(undefined); // 初始文档内容
    const latestUpdate = ref<Delta | undefined>(undefined); // 增量更新内容
    let docManager: DocumentManager;

    const getUser = async () => ({
      userId: "123",
      userName: "John Doe",
      avatar: "https://example.com/avatar.jpg",
    });

    const getDocument = async () => {
      const documentId = route.params.id as string;
      return {
        id: 1,
        documentId,
        name: "测试文档",
        content: JSON.stringify([{ insert: "Hello, world!\n" }]),
      };
    };

    const handleLocalChange = (delta: Delta) => {
      docManager.commitDelta(delta);
    };

    onMounted(async () => {
      const userInfo = await getUser();
      const documentInfo = await getDocument();

      const initialDelta = documentInfo.content
        ? new Delta(JSON.parse(documentInfo.content))
        : undefined;

      editorValue.value = initialDelta;

      docManager = new DocumentManager();
      docManager.setup(
        {
          userInfo,
          documentId: documentInfo.documentId,
        },
        initialDelta
      );

      // ✅ 使用 DocumentManager 中封装的监听器
      docManager.onRemoteDelta((delta) => {
        latestUpdate.value = delta;
      });
    });

    return () => (
      <div class={styles.documentWrapper}>
        {editorValue.value && (
          <Editor
            value={editorValue.value}
            updates={latestUpdate.value}
            onChange={handleLocalChange}
          />
        )}
      </div>
    );
  },
});
