import axios from "axios";
import { getGlobalLogger } from "../../../common/src/utils/Logger";

const instance = axios.create({
  baseURL: "/api", // 可根据开发环境更改
  timeout: 5000,
});

instance.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const logger = getGlobalLogger("document");
    logger.error("Request failed", err);
    return Promise.reject(err);
  }
);

export default instance;
