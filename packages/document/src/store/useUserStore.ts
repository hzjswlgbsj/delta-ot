import { UserInfo } from "@/types/base";
import { defineStore } from "pinia";
import type { UserStore } from "./type";

export const useUserStore = defineStore("user", {
  state: (): UserStore => ({
    userInfo: null,
  }),
  getters: {
    userInfo(state): UserInfo | null {
      return state.userInfo ? { ...state.userInfo } : null;
    },
  },
  actions: {
    setUser(info: UserInfo | null) {
      try {
        if (info && typeof info === "object") {
          // 验证用户信息的必要字段
          if (info.userName && info.userId) {
            // 使用$patch来避免代理问题
            this.$patch({
              userInfo: { ...info },
            });
          } else {
            console.warn("用户信息缺少必要字段:", info);
            this.$patch({ userInfo: null });
          }
        } else {
          this.$patch({ userInfo: null });
        }
      } catch (error) {
        console.error("设置用户信息失败:", error);
        this.$patch({ userInfo: null });
      }
    },
    clear() {
      this.$patch({ userInfo: null });
    },
    // 从localStorage恢复用户信息
    restoreUser(): UserInfo | null {
      try {
        const token = localStorage.getItem("token");

        if (token) {
          // 这里可以添加token验证逻辑
          // 暂时从localStorage获取用户信息
          const userInfoStr = localStorage.getItem("userInfo");

          if (userInfoStr) {
            const userInfo = JSON.parse(userInfoStr);
            // 验证用户信息
            if (userInfo && userInfo.userName && userInfo.userId) {
              this.$patch({ userInfo });
              return userInfo;
            } else {
              console.warn("localStorage中的用户信息格式不正确:", userInfo);
            }
          }
        }
      } catch (error) {
        console.error("恢复用户信息失败:", error);
      }
      return null;
    },
  },
});
