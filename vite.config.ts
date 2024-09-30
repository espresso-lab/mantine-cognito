import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "MantineCognito",
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "@mantine/core",
        "@mantine/hooks",
        "@mantine/form",
        "@tabler/icons-react",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "@mantine/core": "MantineCore",
          "@mantine/form": "MantineForm",
          "@mantine/hooks": "MantineHooks",
          "@tabler/icons-react": "TablerIconsReact",
        },
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [react(), dts()],
});
