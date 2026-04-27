import esbuild from "esbuild";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.join(__dirname, "public", "assets");

await mkdir(outdir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(__dirname, "src", "main.jsx")],
  bundle: true,
  outdir,
  entryNames: "app",
  assetNames: "assets/[name]-[hash]",
  format: "esm",
  jsx: "automatic",
  sourcemap: true,
  conditions: ["style", "browser", "import", "module", "default"],
  loader: {
    ".woff": "file",
    ".woff2": "file",
    ".ttf": "file",
    ".svg": "file"
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development")
  },
  logLevel: "info"
});
