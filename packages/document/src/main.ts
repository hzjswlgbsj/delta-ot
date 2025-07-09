import { createApp } from "vue";
import App from "./App";
import { router } from "./router";
import { createPinia } from "pinia";
import "./tailwind.css";
const app = createApp(App);

app.use(createPinia());
app.use(router);
app.mount("#app");
