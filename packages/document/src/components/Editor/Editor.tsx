import {
  defineComponent,
  onMounted,
  onBeforeUnmount,
  ref,
  PropType,
  watch,
} from "vue";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import styles from "./style.module.less";
import type Delta from "quill-delta";

export default defineComponent({
  name: "Editor",
  props: {
    /** 初始内容（全文） */
    value: Object as PropType<Delta | undefined>,
    /** 增量变更（来自外部） */
    updates: Object as PropType<Delta | undefined>,
    /** 本地变更上抛 */
    onChange: Function as PropType<(delta: Delta) => void>,
  },

  setup(props) {
    const editorRef = ref<HTMLDivElement | null>(null);
    let quill: Quill | null = null;
    let isApplyingExternal = false;

    onMounted(() => {
      if (editorRef.value) {
        quill = new Quill(editorRef.value, {
          theme: "snow",
          modules: {
            toolbar: [
              ["bold", "italic", "underline", "strike"],
              ["blockquote", "code-block"],
              [{ header: 1 }, { header: 2 }],
              [{ list: "ordered" }, { list: "bullet" }],
              [{ script: "sub" }, { script: "super" }],
              [{ indent: "-1" }, { indent: "+1" }],
              [{ direction: "rtl" }],
              [
                {
                  size: [
                    "9pt",
                    "10pt",
                    "11pt",
                    "12pt",
                    "14pt",
                    "16pt",
                    "18pt",
                    "22pt",
                    "24pt",
                    "30pt",
                    "36pt",
                  ],
                },
              ],
              [{ header: [1, 2, 3, 4, 5, 6, false] }],
              [{ color: [] }, { background: [] }],
              [{ font: [] }],
              [{ align: [] }],
              ["link", "image", "video", "formula"],
              ["clean"],
            ],
          },
        });

        // 设置初始内容
        if (props.value) {
          quill.setContents(props.value, "silent");
        }

        quill.on("text-change", (delta, _old, source) => {
          if (source === "user" && !isApplyingExternal && props.onChange) {
            props.onChange(delta);
          }
        });
      }
    });

    watch(
      () => props.updates,
      (delta) => {
        if (quill && delta) {
          isApplyingExternal = true;
          quill.updateContents(delta, "silent");
          isApplyingExternal = false;
        }
      },
      { deep: true }
    );

    watch(
      () => props.value,
      (delta) => {
        if (quill && delta) {
          isApplyingExternal = true;
          quill.setContents(props.value, "silent");
          isApplyingExternal = false;
        }
      },
      { deep: true }
    );

    onBeforeUnmount(() => {
      quill = null;
    });

    return () => <div ref={editorRef} class={styles.editorRoot} />;
  },
});
