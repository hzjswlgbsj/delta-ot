import { defineComponent, onMounted } from "vue";
import { DocumentManager } from "../../DocumentManager";
import { generateUuidV4 } from "../../utils";
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
