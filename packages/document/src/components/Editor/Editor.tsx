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
import { CursorManager } from "../../controllers/CursorManager";
import { documentLogger } from "@/utils";

export default defineComponent({
  name: "Editor",
  props: {
    /** 初始内容（全文） */
    value: Object as PropType<Delta | undefined>,
    /** 增量变更（来自外部） */
    updates: Object as PropType<Delta | undefined>,
    /** 本地变更上抛 */
    onChange: Function as PropType<(delta: Delta) => void>,
    /** 编辑器准备就绪回调 */
    onReady: Function as PropType<(quill: Quill) => void>,
    /** 光标变化回调 */
    onSelectionChange: Function as PropType<
      (range: { index: number; length: number } | null) => void
    >,
    /** 获得焦点回调 */
    onFocus: Function as PropType<() => void>,
    /** 失去焦点回调 */
    onBlur: Function as PropType<() => void>,
  },

  setup(props) {
    const editorRef = ref<HTMLDivElement | null>(null);
    let quill: Quill | null = null;
    let isApplyingExternal = false;
    let cursorManager: CursorManager | null = null;

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
              [{ header: [1, 2, 3, 4, 5, 6, false] }],
              [{ color: [] }, { background: [] }],
              [{ font: [] }],
              [{ align: [] }],
              ["link", "image", "video", "formula"],
              ["clean"],
            ],
          },
        });

        // 初始化光标管理器
        cursorManager = new CursorManager(quill);

        // 设置初始内容
        if (props.value) {
          quill.setContents(props.value, "silent");
        }

        quill.on("text-change", (delta, _old, source) => {
          documentLogger.info(
            "Quill text-change事件:",
            JSON.stringify({
              delta,
              _old,
              source,
            })
          );
          if (source === "user" && !isApplyingExternal && props.onChange) {
            // 传递增量变更
            props.onChange(delta);
          }
        });

        // 监听选区变化
        quill.on("selection-change", (range, _oldRange, source) => {
          if (source === "user" && props.onSelectionChange) {
            props.onSelectionChange(range);
          }
        });

        // 监听焦点变化
        quill.on("focus", () => {
          if (props.onFocus) {
            props.onFocus();
          }
        });

        quill.on("blur", () => {
          if (props.onBlur) {
            props.onBlur();
          }
        });

        // 通知父组件 Quill 已准备就绪
        if (props.onReady) {
          props.onReady(quill);
        }
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
      if (quill) {
        quill.off("text-change");
        quill.off("selection-change");
      }
      quill = null;
      cursorManager = null;
    });

    // 暴露光标相关方法给父组件
    const updateRemoteCursor = (cursor: any) => {
      if (cursorManager) {
        // 远程用户的光标，不显示选中效果
        cursorManager.updateCursor(cursor, false);
      }
    };

    const updateLocalCursor = (cursor: any) => {
      if (cursorManager) {
        // 本地用户的光标，不显示选中效果
        cursorManager.updateCursor(cursor, true);
      }
    };

    const removeRemoteCursor = (userId: string) => {
      if (cursorManager) {
        cursorManager.removeCursor(userId);
      }
    };

    const clearAllRemoteCursors = () => {
      if (cursorManager) {
        cursorManager.clearAll();
      }
    };

    const getRemoteCursorCount = () => {
      return cursorManager ? cursorManager.getCursorCount() : 0;
    };

    return {
      editorRef,
      quill,
      updateRemoteCursor,
      updateLocalCursor,
      removeRemoteCursor,
      clearAllRemoteCursors,
      getRemoteCursorCount,
    };
  },

  render() {
    return <div ref="editorRef" class={styles.editorRoot} />;
  },
});
