import { defineComponent, PropType } from "vue";
import Delta from "quill-delta";
import { DocumentManager } from "@/controllers/DocumentManager";
import { getGlobalLogger } from "../../../../common/src/utils/Logger";

export default defineComponent({
  props: {
    manager: {
      type: Object as PropType<any>,
      required: true,
    },
  },
  setup(props) {
    const insertHello = () => {
      props.manager.commitDelta(new Delta().insert("Hello "));
    };

    const insertWorld = () => {
      props.manager.commitDelta(new Delta().retain(0).insert("World "));
    };

    const deleteFirstChar = () => {
      props.manager.commitDelta(new Delta().retain(0).delete(1));
    };

    const logContents = () => {
      const contents = props.manager.getEditorContents?.();
      const logger = getGlobalLogger("document");
      logger.info("[当前文档内容]", contents);
    };

    return () => (
      <div class="mt-4 p-3 border rounded bg-gray-100 text-sm flex flex-col gap-2">
        <div class="font-semibold mb-1">🧪 协同调试面板</div>
        <button
          class="px-3 py-1 bg-blue-500 text-white rounded"
          onClick={insertHello}
        >
          插入 "Hello"
        </button>
        <button
          class="px-3 py-1 bg-green-500 text-white rounded"
          onClick={insertWorld}
        >
          插入 "World" 到开头
        </button>
        <button
          class="px-3 py-1 bg-red-500 text-white rounded"
          onClick={deleteFirstChar}
        >
          删除第一个字符
        </button>
        <button
          class="px-3 py-1 bg-gray-700 text-white rounded"
          onClick={logContents}
        >
          打印当前内容
        </button>
      </div>
    );
  },
});
