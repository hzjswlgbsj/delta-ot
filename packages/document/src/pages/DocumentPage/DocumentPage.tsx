import { defineComponent, onMounted } from "vue";
import { Document } from "@/components";
import styles from "./style.module.less";

export default defineComponent({
  setup() {
    return () => (
      <div class={styles.documentWrapper}>
        <Document />
      </div>
    );
  },
});
