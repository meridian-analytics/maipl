import react from "@vitejs/plugin-react"
import * as V from "vite"

function safeNumber(value: unknown, orElse: number): number {
  const n = Number.parseInt(value as string)
  return Number.isNaN(n) ? orElse : n
}

// https://vitejs.dev/config/
// https://vitejs.dev/guide/env-and-mode.html
export default V.defineConfig(config => {
  const env = V.loadEnv(config.mode, "./")
  return {
    build: {
      emptyOutDir: true,
    },
    define: {
      global: "window",
      "process.env.NODE_ENV": null,
    },
    envPrefix: "MAIPL_",
    plugins: [react()],
    server: {
      port: safeNumber(env.VITE_PORT, 3000),
    },
  }
})
