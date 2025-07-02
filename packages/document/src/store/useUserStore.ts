import { UserInfo } from "@/types/base";
import { defineStore } from "pinia";

export const useUserStore = defineStore("user", {
  state: (): UserInfo => ({
    id: 0,
    userId: "",
    userName: "",
    avatar: "",
    loginName: "",
    createdAt: "",
    updatedAt: "",
  }),
  getters: {
    userInfo(state): UserInfo {
      return { ...state };
    },
  },
  actions: {
    setUser(info: UserInfo) {
      this.userId = info.userId;
      this.userName = info.userName;
      this.avatar = info.avatar || "";
    },
    clear() {
      this.userId = "";
      this.userName = "";
      this.avatar = "";
      this.token = "";
      localStorage.removeItem("token");
    },
  },
});
