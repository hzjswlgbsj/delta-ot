export type UserInfo = {
  id: number;
  userId: string;
  userName: string;
  avatar: string;
  loginName: string;
  createdAt: string;
  updatedAt: string;
};
export type WebsocketControllerOptions = {
  userInfo: UserInfo;
  guid: string;
};

export type File = {
  id: number;
  guid: string;
  name: string;
  content: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  updater: string;
};
