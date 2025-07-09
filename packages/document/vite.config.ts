import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import path from "path";
import tailwindcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [vue(), vueJsx()],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
  server: {
    port: 3000,
  },
});
