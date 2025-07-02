import request from "@/network/request";
import { UserInfo } from "@/types/base";
import { BaseResponse } from "@/types/network";

export type LoginRes = {
  token: string;
  userInfo: UserInfo;
};

export async function login(
  loginName: string,
  password: string
): Promise<BaseResponse<LoginRes>> {
  return await request.post("/user/login", { loginName, password });
}

export async function getUserInfo(
  userId?: string
): Promise<BaseResponse<UserInfo>> {
  if (userId) {
    return await request.get(`/user/getUserInfo/${userId}`);
  } else {
    return await request.get("/user/getUserInfo");
  }
}
