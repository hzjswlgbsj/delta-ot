// useDocStore.ts
import { defineStore } from "pinia";

export const useDocStore = defineStore("doc", {
  state: () => ({
    documentId: "",
    userIds: [] as string[], // ✅ 显式默认值 + 类型
  }),

  getters: {},

  actions: {
    setUserIds(userIds: string[]) {
      this.userIds = userIds;
    },

    clear() {
      this.userIds = [];
      this.documentId = "";
    },
  },
});
