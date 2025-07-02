import { defineComponent } from "vue";
import styles from "./style.module.less";

export interface ListItemProps {
  file: any; // ✅ 先用 any 兜底，后续定义 File 类型
  onClick: () => void;
}

export default defineComponent({
  props: {
    file: Object,
    onClick: Function,
  },
  setup(props: ListItemProps) {
    const { file, onClick } = props;
    return () => (
      <div class={styles.item} onClick={onClick}>
        <div class={styles.icon}>📄</div>
        <div class={styles.info}>
          <div class={styles.name}>{file.name}</div>
          <div class={styles.meta}>
            <span>{file.author}</span>
            <span>{file.createdAt}</span>
          </div>
        </div>
      </div>
    );
  },
});
