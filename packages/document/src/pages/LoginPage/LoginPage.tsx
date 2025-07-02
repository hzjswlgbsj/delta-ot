import { defineComponent, ref } from "vue";
import { useRouter } from "vue-router";
import styles from "./style.module.less";
// import { login } from "@/services/user";

export default defineComponent({
  setup() {
    const router = useRouter();
    const loginName = ref("");
    const password = ref("");
    const errorMsg = ref("");

    const handleLogin = async () => {
      if (!loginName.value || !password.value) {
        errorMsg.value = "请输入账号和密码";
        return;
      }

      // try {
      //   const { token } = await login({
      //     loginName: loginName.value,
      //     password: password.value,
      //   });
      //   localStorage.setItem("token", token);
      //   localStorage.setItem("loginName", loginName.value);
      //   router.push("/");
      // } catch (err: any) {
      //   errorMsg.value = err?.msg || "登录失败";
      // }
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
