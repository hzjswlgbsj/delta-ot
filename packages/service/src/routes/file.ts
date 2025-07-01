import Router from "koa-router";
import {
  createFile,
  getFileDetail,
  updateFile,
  deleteFile,
  getAllFiles,
} from "../controllers/file";
import { auth } from "../middleware/auth";

const router = new Router();

// 所有接口都需要登录态
router.post("/create", auth, createFile);
router.get("/getFileDetail/:guid", auth, getFileDetail);
router.put("/updateFile/:guid", auth, updateFile);
router.delete("/deleteFile/:guid", auth, deleteFile);
router.get("/getAllFiles", auth, getAllFiles);

export default router;
