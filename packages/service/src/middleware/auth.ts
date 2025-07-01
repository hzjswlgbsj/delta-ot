import { Context, Next } from "koa";
import jwt from "jsonwebtoken";
import { fail } from "../utils/response";
import { SECRET_KEY } from "../config/env";

export async function auth(ctx: Context, next: Next) {
  const authHeader = ctx.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    ctx.body = fail("Missing or invalid token", -1);
    return;
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    ctx.state.user = decoded;
    await next();
  } catch (err) {
    ctx.body = fail("Token expired or invalid", -1);
  }
}
