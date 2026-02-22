import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // OOM Prevention (Issue #236): Limit parallelism and memory
    pool: "threads",
    poolOptions: {
      threads: {
        maxThreads: 2, // Down from 8-12 default, prevents 13GB+ RAM usage
        minThreads: 1,
      },
    },
    isolate: true, // Ensure test isolation between files
    clearMocks: true, // Clear mocks after each test
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
