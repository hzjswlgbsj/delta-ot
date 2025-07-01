import { Context } from "koa";
import { User } from "../db/models/User";
import { signToken } from "../utils/jwt";
import { getBody } from "../utils/body";
import { RegisterBody, LoginBody, UpdateUserBody } from "../types/user";
import { success, fail } from "../utils/response";

export async function register(ctx: Context) {
  const body = getBody<RegisterBody>(ctx);
  const { userId, userName, password, avatar } = body;

  const existing = await User.findByPk(userId);
  if (existing) {
    ctx.body = fail("User already exists", 1001);
    return;
  }

  await User.create({ userId, userName, password, avatar });
  ctx.body = success(null, "User registered successfully");
}

export async function login(ctx: Context) {
  const body = getBody<LoginBody>(ctx);
  const { userId, password } = body;

  const user = await User.findByPk(userId);
  if (!user || user.password !== password) {
    ctx.body = fail("Invalid credentials", 1002);
    return;
  }

  const token = signToken({ userId });
  ctx.body = success({ token }, "Login successful");
}

export async function getUserInfo(ctx: Context) {
  const userId = ctx.params.userId;
  const user = await User.findByPk(userId);
  if (!user) {
    ctx.body = fail("User not found", 1003);
    return;
  }
  ctx.body = success(user);
}

export async function updateUser(ctx: Context) {
  const userId = ctx.params.userId;
  const body = getBody<UpdateUserBody>(ctx);
  const user = await User.findByPk(userId);
  if (!user) {
    ctx.body = fail("User not found", 1004);
    return;
  }
  await user.update(body);
  ctx.body = success(null, "User updated successfully");
}

export async function deleteUser(ctx: Context) {
  const userId = ctx.params.userId;
  const user = await User.findByPk(userId);
  if (!user) {
    ctx.body = fail("User not found", 1005);
    return;
  }
  await user.destroy();
  ctx.body = success(null, "User deleted successfully");
}

export async function getAllUsers(ctx: Context) {
  const users = await User.findAll();
  ctx.body = success(users);
}
