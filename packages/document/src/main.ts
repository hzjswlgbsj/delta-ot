import { createApp } from "vue";
import App from "./App";
import { router } from "./router";
import { createPinia } from "pinia";
import "./tailwind.css";
import "element-plus/dist/index.css";
import { getGlobalLogger } from "../../common/src/utils/Logger";

// 初始化document模块的logger
const documentLogger = getGlobalLogger("document");

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.mount("#app");
