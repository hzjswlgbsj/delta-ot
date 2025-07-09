import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { DocumentPage, LoginPage, FilePage, ClientTestPage } from "../pages";

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
  {
    path: "/client-test",
    name: "ClientTestPage",
    component: ClientTestPage,
  },
  {
    path: "/test-collab",
    name: "TestPage",
    component: () => import("@/test-lab/collab/TestPage"),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
