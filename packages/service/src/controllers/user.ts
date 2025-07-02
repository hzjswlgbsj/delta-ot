import { Context } from "koa";
import { User } from "../db/models/User";
import { decodeToken, signToken } from "../utils/jwt";
import { getBody } from "../utils/body";
import { RegisterBody, LoginBody, UpdateUserBody } from "../types/user";
import { success, fail } from "../utils/response";
import { v4 as uuidv4 } from "uuid";
import { ErrorCode } from "../types/error-code";
import { loggedInUserStore } from "../auth/LoggedInUserStore";

export async function register(ctx: Context) {
  const body = getBody<RegisterBody>(ctx);
  const { loginName, userName, password, avatar } = body;

  if (!loginName) {
    ctx.body = fail("Missing loginName", ErrorCode.MISSING_LOGIN_NAME);
    return;
  }

  const userId = uuidv4(); // 服务端生成
  const sameLogin = await User.findOne({ where: { userName, loginName } });
  if (sameLogin) {
    ctx.body = fail("User already exists", ErrorCode.USER_ALREADY_EXISTS);
    return;
  }

  const user = await User.create({
    userId,
    userName,
    loginName,
    password,
    avatar,
  });
  ctx.body = success({ userId: user.userId }, "Register success");
}

export async function login(ctx: Context) {
  const body = getBody<LoginBody>(ctx);
  const { loginName, password } = body;

  const user = await User.findOne({ where: { loginName } });
  if (!user || user.password !== password) {
    ctx.body = fail("Invalid credentials", ErrorCode.INVALID_CREDENTIALS);
    return;
  }

  const token = signToken({ userId: user.userId });
  loggedInUserStore.add(user.userId, token);
  ctx.body = success({ token }, "Login successful");
}

export async function getUserInfo(ctx: Context) {
  const userId = ctx.params.userId;
  const user = await User.findOne({ where: { userId } });

  if (!user) {
    ctx.body = fail("User not found", ErrorCode.USER_NOT_FOUND);
    return;
  }
  ctx.body = success(user);
}

export async function updateUser(ctx: Context) {
  const userId = ctx.params.userId;
  const body = getBody<UpdateUserBody>(ctx);
  const user = await User.findOne({ where: { userId } });
  if (!user) {
    ctx.body = fail("User not found", ErrorCode.USER_NOT_FOUND);
    return;
  }

  // 仅允许更新部分字段
  const { userName, avatar } = body;
  await user.update({ userName, avatar });

  ctx.body = success(null, "User updated successfully");
}

export async function deleteUser(ctx: Context) {
  const userId = ctx.params.userId;
  const user = await User.findOne({ where: { userId } });

  if (!user) {
    ctx.body = fail("User not found", ErrorCode.USER_NOT_FOUND);
    return;
  }
  await user.destroy();
  ctx.body = success(null, "User deleted successfully");
}

export async function getAllUsers(ctx: Context) {
  const users = await User.findAll();
  ctx.body = success(users);
}
