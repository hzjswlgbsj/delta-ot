import { Middleware } from "koa";
import type Koa from "koa";
import bodyParser from "koa-bodyparser";

export function withBody<T = any>(
  handler: (
    ctx: Koa.ParameterizedContext & { request: { body: T } }
  ) => Promise<any> | void
): Middleware {
  const parser = bodyParser();

  return async (ctx, next) => {
    await parser(ctx, async () => {
      await handler(ctx as any); // 强转为带 body 类型的 ctx
    });
    await next();
  };
}
