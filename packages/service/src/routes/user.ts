import Router from "koa-router";
import { auth } from "../middleware/auth";
import {
  register,
  login,
  getUserInfo,
  getAllUsers,
  updateUser,
  deleteUser,
} from "../controllers/user";

const router = new Router();

// 用户注册：POST /api/user/register
router.post("/register", register);

// 用户登录：POST /api/user/login
router.post("/login", login);

// 获取所有用户：GET /api/user
router.get("/getAllUsers", auth, getAllUsers);

// 获取某个用户：GET /api/user/:userId
router.get("/getUserInfo/:userId", auth, getUserInfo);

// 更新用户信息：PUT /api/user/:userId
router.put("/updateUser/:userId", auth, updateUser);

// 删除用户：DELETE /api/user/:userId
router.delete("/deleteUser/:userId", auth, deleteUser);

export default router;
