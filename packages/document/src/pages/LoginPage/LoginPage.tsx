import { defineComponent, ref } from "vue";
import { useRouter } from "vue-router";
import styles from "./style.module.less";
import { login } from "@/services/user";
import { useUserStore } from "@/store/useUserStore";
import { initGlobalLogger } from "../../../../common/src/utils/Logger";

export default defineComponent({
  setup() {
    const router = useRouter();
    const loginName = ref("");
    const password = ref("");
    const errorMsg = ref("");
    const store = useUserStore();

    const handleLogin = async () => {
      if (!loginName.value || !password.value) {
        errorMsg.value = "请输入账号和密码";
        return;
      }

      const res = await login(loginName.value, password.value);
      if (res.code !== 0) {
        errorMsg.value = res.msg || "登录失败";
        return;
      }

      const { token, userInfo } = res.data;

      // 验证用户信息
      if (!userInfo || !userInfo.userId || !userInfo.userName) {
        errorMsg.value = "用户信息不完整";
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("userInfo", JSON.stringify(userInfo));
      store.setUser(userInfo);

      // 初始化全局日志系统
      initGlobalLogger({
        username: userInfo.userName,
        clientId: userInfo.userId, // 使用userId作为clientId，确保每个客户端唯一
      });

      router.push("/");
    };

    return () => (
      <div class={styles.loginContainer}>
        <h2>登录</h2>
        <input
          v-model={loginName.value}
          placeholder="登录名"
          class={styles.input}
        />
        <input
          v-model={password.value}
          type="password"
          placeholder="密码"
          class={styles.input}
        />
        <button class={styles.button} onClick={handleLogin}>
          登录
        </button>
        {errorMsg.value && <p class={styles.error}>{errorMsg.value}</p>}
      </div>
    );
  },
});
