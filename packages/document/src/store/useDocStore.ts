import { DocumentRuntimeInfo } from "./type";
import { defineStore } from "pinia";

export const useDocStore = defineStore("user", {
  state: (): DocumentRuntimeInfo => ({
    documentId: "",
    userIds: [],
  }),
  getters: {
    userIds(state): string[] {
      return state.userIds;
    },
  },
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
