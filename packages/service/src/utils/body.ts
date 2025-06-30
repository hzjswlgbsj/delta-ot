import Koa from "koa";

export function getBody<T>(ctx: Koa.Context): T {
  return ctx.request.body as T;
}
