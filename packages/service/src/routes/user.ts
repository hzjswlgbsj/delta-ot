import Router from "koa-router";
import {
  register,
  login,
  getUserInfo,
  getAllUsers,
  updateUser,
  deleteUser,
} from "../controllers/user";

const router = new Router();

/**
 * RESTful 路由设计
 * 所有路径基于前缀 /api/user
 */

// 获取所有用户：GET /api/user
router.get("/getAllUsers", getAllUsers);

// 获取某个用户：GET /api/user/:userId
router.get("/getUserInfo/:userId", getUserInfo);

// 用户注册：POST /api/user/register
router.post("/register", register);

// 用户登录：POST /api/user/login
router.post("/login", login);

// 更新用户信息：PUT /api/user/:userId
router.put("/updateUser/:userId", updateUser);

// 删除用户：DELETE /api/user/:userId
router.delete("/deleteUser/:userId", deleteUser);

export default router;
