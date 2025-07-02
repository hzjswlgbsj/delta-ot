import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../config/env";

/**
 * 签发 JWT Token（默认 7 天过期）
 * @param payload - 要加密的载荷数据（例如 userId）
 * @returns JWT 字符串
 */
export function signToken(payload: any): string {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: "7d" });
}

/**
 * 校验并解析 JWT Token（会抛出异常，请在外部捕获）
 * @param token - JWT 字符串
 * @returns 解码后的 Payload 对象（例如 { userId, iat, exp }）
 */
export function verifyToken(token: string): any {
  return jwt.verify(token, SECRET_KEY);
}

/**
 * 解码 JWT Token，不做签名校验（仅用于提取 exp 过期时间等信息）
 * ⚠️ 注意：此方法不安全，仅用于内部逻辑处理，不可用于身份验证
 * @param token - JWT 字符串
 * @returns 解码后的 Payload 对象（不保证其合法性）
 */
export function decodeToken(token: string): any {
  return jwt.decode(token);
}
