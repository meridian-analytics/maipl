import react from "@vitejs/plugin-react"
import * as V from "vite"

function safeNumber(value: string, orElse: number): number {
  const n = Number.parseInt(value)
  return Number.isNaN(n) ? orElse : n
}

// https://vitejs.dev/config/
// https://vitejs.dev/guide/env-and-mode.html
export default V.defineConfig((config) => {
  const env = V.loadEnv(config.mode, "./")
  return {
    base: env["VITE_BASE_URL"] || "/",
    build: {
      emptyOutDir: true,
    },
    define: {
      global: "window",
    },
    envPrefix: "MAIPL_",
    plugins: [react()],
    server: {
      port: safeNumber(env["VITE_PORT"], 3000),
    },
  }
})
