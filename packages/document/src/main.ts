// src/main.ts
import { createApp } from "vue";
import App from "./App";
import { router } from "./router";
import { createPinia } from "pinia";

const app = createApp(App);
app.use(router);
app.use(createPinia());
app.mount("#app");
