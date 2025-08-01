import { defineComponent, PropType } from "vue";
import Delta from "quill-delta";
import { DocumentManager } from "@/controllers/DocumentManager";
import { documentLogger } from "../../../utils/logger";
import styles from "./style.module.less";

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
      const logger = documentLogger;
      logger.info("[当前文档内容]", contents);
    };

    return () => (
      <div class={styles.controlPanel}>
        <div class={styles.title}>🧪 协同调试面板</div>
        <div class={styles.buttonGroup}>
          <button
            class={`${styles.button} ${styles.insertHello}`}
            onClick={insertHello}
          >
            插入 "Hello"
          </button>
          <button
            class={`${styles.button} ${styles.insertWorld}`}
            onClick={insertWorld}
          >
            插入 "World" 到开头
          </button>
          <button
            class={`${styles.button} ${styles.deleteFirst}`}
            onClick={deleteFirstChar}
          >
            删除第一个字符
          </button>
          <button
            class={`${styles.button} ${styles.logContents}`}
            onClick={logContents}
          >
            打印当前内容
          </button>
        </div>
      </div>
    );
  },
});
