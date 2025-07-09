import { UserInfo } from "@/types/base";

export type DocumentRuntimeInfo = {
  documentId: string;
  /** 当前文档中正在协同的用户 ids */
  userIds: string[];
};

export type UserStore = {
  userInfo: UserInfo | null;
};
