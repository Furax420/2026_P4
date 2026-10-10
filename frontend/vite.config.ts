import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import istanbul from "vite-plugin-istanbul";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    istanbul({
      include: ["src/**/*"],
      exclude: ["src/types/**", "src/**/*.d.ts"],
      extension: [".ts", ".tsx"],
      requireEnv: true,
      checkProd: true,
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
