import { UserInfo } from "@/types/base";
import { defineStore } from "pinia";
import type { UserStore } from "./type";
export const useUserStore = defineStore("user", {
  state: (): UserStore => ({
    userInfo: null,
  }),
  getters: {
    userInfo(state): UserInfo {
      return { ...state.userInfo };
    },
  },
  actions: {
    setUser(info: UserInfo) {
      if (!this.userInfo) {
        this.userInfo = info;
      }
    },
    clear() {
      this.userInfo = null;
    },
  },
});
