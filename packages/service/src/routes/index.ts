import Router from "koa-router";
import userRouter from "./user";
import fileRouter from "./file";
import adminRouter from "./admin";

const router = new Router();
router.use("/api/user", userRouter.routes());
router.use("/api/file", fileRouter.routes());
router.use("/api/admin", adminRouter.routes());

export default router;
