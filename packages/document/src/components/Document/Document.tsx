import { defineComponent, onMounted, ref } from "vue";
import { DocumentManager } from "../../controllers/DocumentManager";
import { Editor } from "@/components";
import styles from "./style.module.less";
import { useRoute, useRouter } from "vue-router";
import Delta from "quill-delta";
import { getFileInfo } from "@/services/file";
import { safeJsonParse } from "@/utils";
import { getUserInfo } from "@/services/user";
import { useUserStore } from "@/store/useUserStore";

export default defineComponent({
  setup() {
    const route = useRoute();
    const router = useRouter();
    const editorValue = ref<Delta>(null);
    const latestUpdate = ref<Delta>(null);
    const loading = ref(false);
    let docManager: DocumentManager;
    const userStore = useUserStore();

    const getUser = async () => {
      try {
        const res = await getUserInfo();
        if (res.code === 0 && res.data) {
          userStore.setUser(res.data);
          return res.data; // 返回用户信息
        } else {
          console.warn("获取用户信息失败:", res.msg);
          // 如果获取用户信息失败，尝试从localStorage恢复
          const restoredUser = userStore.restoreUser();
          if (!restoredUser) {
            // 如果localStorage中也没有用户信息，重定向到登录页
            router.push("/login");
            return null;
          }
          return restoredUser; // 返回恢复的用户信息
        }
      } catch (error) {
        console.error("获取用户信息出错:", error);
        // 尝试从localStorage恢复
        const restoredUser = userStore.restoreUser();
        if (!restoredUser) {
          // 如果localStorage中也没有用户信息，重定向到登录页
          router.push("/login");
          return null;
        }
        return restoredUser; // 返回恢复的用户信息
      }
    };

    const getDocument = async () => {
      const guid = route.params.guid as string;
      if (guid) {
        const res = await getFileInfo(guid);
        if (res.code === 0) {
          return res.data;
        } else {
          throw new Error(res.msg || "获取文档失败");
        }
      }
    };

    const handleLocalChange = (delta: Delta) => {
      docManager.commitDelta(delta);
    };

    onMounted(async () => {
      loading.value = true;
      try {
        // 确保用户信息加载成功
        const userInfo = await getUser();
        if (!userInfo) {
          // 如果用户信息加载失败，已经重定向到登录页，这里直接返回
          return;
        }

        const fileInfo = await getDocument();
        const initialDelta = fileInfo.content
          ? new Delta(safeJsonParse(fileInfo.content))
          : null;

        editorValue.value = initialDelta;

        docManager = new DocumentManager();

        // 直接使用获取到的用户信息
        docManager.setup(fileInfo.guid, userInfo, initialDelta);

        // 使用 DocumentManager 中封装的监听器
        docManager.onRemoteDelta((delta) => {
          latestUpdate.value = delta;
        });
      } catch (error) {
        console.error("初始化文档失败:", error);
        // 如果是用户信息问题，重定向到登录页
        if (error.message.includes("用户信息不存在")) {
          router.push("/login");
        }
      } finally {
        loading.value = false;
      }
    });

    return () => (
      <div class={styles.documentWrapper}>
        {loading.value && <div class={styles.loading}>Loading...</div>}

        <Editor
          v-show={!loading.value}
          value={editorValue.value}
          updates={latestUpdate.value}
          onChange={handleLocalChange}
        />
      </div>
    );
  },
});
