import { defineComponent, onMounted, ref } from "vue";
import { login } from "@/services/user";
import ClientEditorBox from "@/test-lab/collab/ClientEditorBox";
import { useRoute } from "vue-router";
import { Op } from "quill-delta";
import { initGlobalLogger } from "../../../../common/src/utils/Logger";
export default defineComponent({
  setup() {
    const route = useRoute();
    const loading = ref(true);
    const error = ref("");
    const update = ref<Op[]>([]);
    const user = ref<any>(null);
    const { loginName, pwd, docId, clientId } = route.query;

    const init = async () => {
      if (!loginName || !pwd) {
        error.value = "缺少登录参数";
        return;
      }

      try {
        const res = await login(loginName as string, pwd as string);
        if (res.code !== 0) throw new Error(res.msg || "登录失败");

        user.value = res.data.userInfo;

        // 登录成功后初始化Logger
        console.log(
          "[ClientTestPage] 登录成功，初始化Logger:",
          user.value.userName,
          "clientId:",
          clientId
        );

        // 强制重新初始化Logger，确保使用正确的用户配置
        console.log("[ClientTestPage] 强制重新初始化Logger");
        initGlobalLogger({
          username: user.value.userName,
          clientId: clientId as string, // 使用URL参数中的clientId
        });

        loading.value = false;
      } catch (err: any) {
        error.value = err.message || "未知错误";
      }
    };

    onMounted(async () => {
      window.addEventListener("message", (event) => {
        console.log("收到消息:", event.data);
        if (event.data && event.data.ops) {
          update.value.splice(0, update.value.length, ...event.data.ops);
        } else if (event.data && Array.isArray(event.data)) {
          // 兼容直接发送ops数组的情况
          update.value.splice(0, update.value.length, ...event.data);
        }
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
