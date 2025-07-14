// 包裹一个 editor + 状态展示（user、ack、delta）
import { defineComponent, onMounted, ref } from "vue";
import IframeMessageManager from "../utils/IframeMessageManager";
import {
  basicInsertConflict,
  insertAtDifferentPositions,
  concurrentDeleteAndInsert,
  formatConflict,
  query1,
  query2,
} from "./testCases";

export default defineComponent({
  setup() {
    const iframe1 = ref<HTMLIFrameElement | null>(null);
    const iframe2 = ref<HTMLIFrameElement | null>(null);

    onMounted(() => {
      const messageManager1 = new IframeMessageManager(
        iframe1.value?.contentWindow
      );
      const messageManager2 = new IframeMessageManager(
        iframe2.value?.contentWindow
      );

      setTimeout(() => {
        messageManager1.send(formatConflict[0]);
        messageManager2.send(formatConflict[1]);
      }, 3000);
    });

    return () => (
      <div class="grid grid-cols-2 gap-4 p-4">
        <iframe
          ref={iframe1}
          src={`/client-test?${query1}`}
          class="w-full h-[90vh] border shadow"
        />
        <iframe
          ref={iframe2}
          src={`/client-test?${query2}`}
          class="w-full h-[90vh] border shadow"
        />
      </div>
    );
  },
});
