import { defineComponent, onMounted, ref } from "vue";
import { login } from "@/services/user";
import ClientEditorBox from "@/test-lab/collab/ClientEditorBox";
import { useRoute } from "vue-router";

export default defineComponent({
  setup() {
    const route = useRoute();
    const loading = ref(true);
    const error = ref("");
    const user = ref<any>(null);
    const { loginName, pwd, docId, simulateConflict, insertText, insertAt } =
      route.query;

    onMounted(async () => {
      if (!loginName || !pwd) {
        error.value = "缺少登录参数";
        return;
      }

      try {
        const res = await login(loginName as string, pwd as string);
        if (res.code !== 0) throw new Error(res.msg || "登录失败");

        user.value = res.data.userInfo;
        loading.value = false;
      } catch (err: any) {
        error.value = err.message || "未知错误";
      }
    });

    return () => (
      <div class="p-4 bg-gray-50 h-screen">
        {error.value ? (
          <div class="text-red-500">{error.value}</div>
        ) : loading.value ? (
          <div class="text-gray-400">登录中...</div>
        ) : (
          <ClientEditorBox
            user={user.value}
            documentId={docId as string}
            simulateConflict={simulateConflict === "true"}
            insertText={insertText as string}
            insertAt={parseInt((insertAt as string) || "0")}
          />
        )}
      </div>
    );
  },
});
