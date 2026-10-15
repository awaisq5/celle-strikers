import { defineConfig } from "vitest/config";

// Tests compile JSX with esbuild's automatic runtime, like the app build does with the React plugin.
export default defineConfig({
  esbuild: { jsx: "automatic" },
});
