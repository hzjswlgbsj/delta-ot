import axios from "axios";

const instance = axios.create({
  baseURL: "/api", // 可根据开发环境更改
  timeout: 5000,
});

instance.interceptors.response.use(
  (res) => res.data,
  (err) => {
    console.error("Request failed", err);
    return Promise.reject(err);
  }
);

export default instance;
