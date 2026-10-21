import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Live tests call real external APIs; run them explicitly with `npm run test:live`
    exclude: ["**/node_modules/**", ...(process.env.LIVE === "1" ? [] : ["src/**/*.live.test.ts"])],
  },
});
