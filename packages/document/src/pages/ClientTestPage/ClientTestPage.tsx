import { defineComponent, onMounted, ref } from "vue";
import { login } from "@/services/user";
import ClientEditorBox from "@/test-lab/collab/ClientEditorBox";
import { useRoute } from "vue-router";
import { Op } from "quill-delta";
export default defineComponent({
  setup() {
    const route = useRoute();
    const loading = ref(true);
    const error = ref("");
    const update = ref<Op[]>([]);
    const user = ref<any>(null);
    const { loginName, pwd, docId } = route.query;

    const init = async () => {
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
    };

    onMounted(async () => {
      window.addEventListener("message", (event) => {
        update.value.splice(0, update.value.length, ...event.data.ops);
      });
      await init();
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
            update={update.value}
          />
        )}
      </div>
    );
  },
});
