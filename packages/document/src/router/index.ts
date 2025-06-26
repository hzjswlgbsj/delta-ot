import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import Home from "../pages/Home";
import Document from "../pages/DocumentPage/DocumentPage";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: Home,
  },
  {
    path: "/docs/:id",
    name: "docs",
    component: Document,
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
