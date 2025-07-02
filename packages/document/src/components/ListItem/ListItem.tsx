import { defineComponent } from "vue";
import { File } from "../../types/base";
import styles from "./style.module.less";
import dayjs from "dayjs";

export interface ListItemProps {
  file: File;
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
          <div class={styles.row}>
            <span class={styles.name}>{file.name}</span>
            <span class={styles.meta}>
              {file.authorId} ·{" "}
              {dayjs(file.createdAt).format("YYYY-MM-DD HH:mm")}
            </span>
          </div>
        </div>
      </div>
    );
  },
});
