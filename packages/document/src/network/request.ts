import axios, { AxiosResponse } from "axios";
import { BaseResponse } from "@/types/network"; // 你定义的返回类型
import { router } from "@/router";

const request = axios.create({
  baseURL: "http://localhost:4000/api",
  timeout: 5000,
});

// 请求拦截器：添加 token
request.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse<BaseResponse>) => {
    const res = response.data;

    if (res.code === -1) {
      localStorage.removeItem("token");
      router.push("/login");
      return Promise.reject(new Error(res.msg || "Token expired"));
    }

    // ✅ 强行断言为 any，绕过 Axios 的类型检查
    return res as any;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default request;
