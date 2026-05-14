import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

function copyExtensionAssets(): Plugin {
  return {
    name: "copy-extension-assets",
    closeBundle() {
      const distDir = resolve(rootDir, "dist");
      const stylesDir = resolve(distDir, "styles");
      const iconsDir = resolve(distDir, "icons");

      mkdirSync(stylesDir, { recursive: true });
      mkdirSync(iconsDir, { recursive: true });
      copyFileSync(resolve(rootDir, "manifest.json"), resolve(distDir, "manifest.json"));
      copyFileSync(resolve(rootDir, "src/styles/content.css"), resolve(stylesDir, "content.css"));
      copyFileSync(resolve(rootDir, "icons/icon-16.png"), resolve(iconsDir, "icon-16.png"));
      copyFileSync(resolve(rootDir, "icons/icon-32.png"), resolve(iconsDir, "icon-32.png"));
      copyFileSync(resolve(rootDir, "icons/icon-48.png"), resolve(iconsDir, "icon-48.png"));
      copyFileSync(resolve(rootDir, "icons/icon-128.png"), resolve(iconsDir, "icon-128.png"));

      const contentScript = readFileSync(resolve(distDir, "content/content-script.js"), "utf8");

      if (/^\s*import\s/m.test(contentScript) || /import\(/.test(contentScript)) {
        throw new Error("content-script.js nao pode conter imports ESM; content scripts MV3 declarados no manifest nao rodam como module.");
      }
    }
  };
}

export default defineConfig({
  publicDir: false,
  plugins: [copyExtensionAssets()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        "background/service-worker": resolve(rootDir, "src/background/service-worker.ts"),
        "content/content-script": resolve(rootDir, "src/content/content-script.ts"),
        popup: resolve(rootDir, "src/popup/popup.html"),
        options: resolve(rootDir, "src/options/options.html")
      },
      output: {
        entryFileNames(chunkInfo) {
          if (chunkInfo.name === "background/service-worker") {
            return "background/service-worker.js";
          }

          if (chunkInfo.name === "content/content-script") {
            return "content/content-script.js";
          }

          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
