import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { DocumentPage, LoginPage, FilePage } from "../pages";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "files",
    component: FilePage,
  },
  {
    path: "/docs/:guid",
    name: "docs",
    component: DocumentPage,
  },
  {
    path: "/login",
    name: "login",
    component: LoginPage,
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
