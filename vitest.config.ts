import path from "path"
import { defineConfig } from "vitest/config"

// Dates are calendar dates in the user's zone; run tests in WIB so the UTC-vs-local
// bugs the helpers guard against actually show up here.
process.env.TZ = "Asia/Jakarta"

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
