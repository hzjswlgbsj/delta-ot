import { Context } from "koa";
import { User } from "../db/models/User";
import { signToken } from "../utils/jwt";
import { getBody } from "../utils/body";
import { RegisterBody, LoginBody, UpdateUserBody } from "../types/user";

// 注册
export async function register(ctx: Context) {
  const { userId, userName, password, avatar } = getBody<RegisterBody>(ctx);

  const existing = await User.findByPk(userId);
  if (existing) {
    ctx.status = 400;
    ctx.body = { success: false, message: "User already exists" };
    return;
  }

  const newUser = await User.create({ userId, userName, password, avatar });
  ctx.body = { success: true, data: newUser };
}

// 登录
export async function login(ctx: Context) {
  const { userId, password } = getBody<LoginBody>(ctx);

  const user = await User.findByPk(userId);
  if (!user || user.password !== password) {
    ctx.status = 401;
    ctx.body = { success: false, message: "Invalid credentials" };
    return;
  }

  const token = signToken({ userId });
  ctx.body = { success: true, data: { token, user } };
}

// 获取单个用户信息
export async function getUserInfo(ctx: Context) {
  const { userId } = ctx.params;
  const user = await User.findByPk(userId);
  console.log("获取用户信息", user);
  if (!user) {
    ctx.status = 404;
    ctx.body = { success: false, message: "User not found" };
    return;
  }
  ctx.body = { success: true, data: user };
}

// 更新用户
export async function updateUser(ctx: Context) {
  const { userId } = ctx.params;
  const updates = getBody<UpdateUserBody>(ctx);

  const user = await User.findByPk(userId);
  if (!user) {
    ctx.status = 404;
    ctx.body = { success: false, message: "User not found" };
    return;
  }

  await user.update(updates);
  ctx.body = { success: true, data: user };
}

// 删除用户
export async function deleteUser(ctx: Context) {
  const { userId } = ctx.params;
  const user = await User.findByPk(userId);
  if (!user) {
    ctx.status = 404;
    ctx.body = { success: false, message: "User not found" };
    return;
  }

  await user.destroy();
  ctx.body = { success: true };
}

// 获取所有用户
export async function getAllUsers(ctx: Context) {
  const users = await User.findAll();
  console.log("获取所有用户", users);
  ctx.body = { success: true, data: users };
}
