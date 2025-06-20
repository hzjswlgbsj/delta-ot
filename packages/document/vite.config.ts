import { defineConfig } from "vite";
const path = require("path");

export default defineConfig({
  resolve: {
    extensions: [".ts", ".js", ".json"], // 确保支持 .ts 扩展名
    alias: {
      "@delta-ot/collaborate": path.resolve(__dirname, "../collaborate/dist"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    target: "esnext",
    outDir: "dist",
  },
});
