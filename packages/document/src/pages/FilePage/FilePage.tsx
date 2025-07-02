import { defineComponent, onMounted, ref } from "vue";
import { ListItem } from "@/components";
import styles from "./style.module.less";
import { router } from "@/router";
import { getFiles } from "@/services/file";

export default defineComponent({
  setup() {
    const files = ref([]);

    onMounted(async () => {
      const res = await getFiles();
      if (res.code === 0) {
        files.value = res.data;
      }
    });

    const handleClick = (guid: string) => {
      router.push(`/docs/${guid}`);
    };

    return () => (
      <div class={styles.pageWrapper}>
        {files.value.map((file: any) => (
          <ListItem
            key={file.guid}
            file={file}
            onClick={() => handleClick(file.guid)}
          />
        ))}
      </div>
    );
  },
});
