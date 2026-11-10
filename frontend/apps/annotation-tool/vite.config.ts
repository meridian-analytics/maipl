import react from "@vitejs/plugin-react"
import * as V from "vite"

function safeNumber(value: string, orElse: number): number {
  const n = Number.parseInt(value)
  return Number.isNaN(n) ? orElse : n
}

// https://vitejs.dev/config/
// https://vitejs.dev/guide/env-and-mode.html
export default V.defineConfig(config => {
  const env = V.loadEnv(config.mode, "./")
  return {
    base: env["VITE_BASE_URL"] || "/",
    build: {
      emptyOutDir: true,
      sourcemap: true,
    },
    define: {
      global: "window",
    },
    envPrefix: "MAIPL_",
    optimizeDeps: {
      include: [
        "@emotion/react",
        "@emotion/styled",
        "@mui/icons-material",
        "@mui/material",
      ],
    },
    plugins: [react()],
    server: {
      hmr: {
        clientPort: safeNumber(env["VITE_HMR_CLIENT_PORT"], 8080),
      },
      host: env["VITE_HOST"] || "127.0.0.1",
      port: safeNumber(env["VITE_PORT"], 3000),
    },
  }
})
