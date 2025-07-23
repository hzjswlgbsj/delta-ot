import { createApp } from "vue";
import App from "./App";
import { router } from "./router";
import { createPinia } from "pinia";
import "./tailwind.css";
import "element-plus/dist/index.css";
const app = createApp(App);

app.use(createPinia());
app.use(router);
app.mount("#app");
