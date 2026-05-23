import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const srcDir = resolve(root, "src");
const distDir = resolve(root, "dist");

async function build() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  // Ship a non-bundled build so consumers can use their own bundler pipeline.
  await cp(srcDir, resolve(distDir, "src"), { recursive: true });

  await writeFile(
    resolve(distDir, "index.js"),
    'export * from "./src/index.js";\n',
    "utf8"
  );

  await writeFile(
    resolve(distDir, "index.prod.js"),
    'export * from "./src/index.prod.js";\n',
    "utf8"
  );

  console.log("Built non-bundled ESM output in dist/.");
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
