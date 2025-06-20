export type UserInfo = {
  userId: string;
  userName: string;
  avatar?: string;
};
export interface WebsocketControllerOptions {
  userInfo: UserInfo;
  documentId: string;
}
