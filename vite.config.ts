import path from "path";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import dts from "unplugin-dts/vite";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "MantineCognito",
      fileName: (format) => `index.${format}.js`,
    },
    rolldownOptions: {
      external: [
        /^react(\/.*)?$/,
        /^react-dom(\/.*)?$/,
        /^@mantine\//,
        /^@tabler\/icons-react/,
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
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    dts({ tsconfigPath: "./tsconfig.build.json" }),
  ],
});
