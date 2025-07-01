import Router from "koa-router";
import userRouter from "./user";
import fileRouter from "./file";

const router = new Router();
router.use("/api/user", userRouter.routes());
router.use("/api/file", fileRouter.routes());

export default router;
