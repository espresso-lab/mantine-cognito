import path from "path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import dts from "unplugin-dts/vite";

function tablerIconsResolve(): Plugin {
  return {
    name: "tabler-icons-resolve",
    enforce: "pre",
    async resolveId(id) {
      if (id === "@tabler/icons-react") return this.resolve("@tabler/icons-react/dist/esm/icons/index.mjs");
    },
  };
}

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
    tablerIconsResolve(),
    dts({ tsconfigPath: "./tsconfig.build.json" }),
  ],
});
