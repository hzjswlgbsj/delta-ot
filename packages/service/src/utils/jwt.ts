import jwt, { SignOptions } from "jsonwebtoken";
import { SECRET_KEY } from "../config/env";

if (!SECRET_KEY) {
  throw new Error("SECRET_KEY is not defined in .env file");
}

// 生成 JWT（有效期默认 7 天）
export function signToken(
  payload: Record<string, any>,
  expiresIn: SignOptions["expiresIn"] = "7d"
): string {
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

// 验证 JWT
export function verifyToken<T = any>(token: string): T | null {
  try {
    return jwt.verify(token, SECRET_KEY) as T;
  } catch (err) {
    return null;
  }
}
