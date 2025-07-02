import { defineComponent, onMounted, ref } from "vue";
import { ListItem } from "@/components";
import styles from "./style.module.less";
import { router } from "@/router";

export default defineComponent({
  setup() {
    const files = ref([]);

    onMounted(async () => {
      const res = await fetch("/api/file/list", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const json = await res.json();
      if (json.code === 0) {
        files.value = json.data;
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
            file={file.name}
            onClick={() => handleClick(file.guid)}
          />
        ))}
      </div>
    );
  },
});
