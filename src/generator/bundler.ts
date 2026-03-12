import { build } from "esbuild";
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";

const BUILD_TARGET = "node22";

export async function bundleUserCode(inputFile: string, outputDir: string): Promise<void> {
  await build({
    entryPoints: [inputFile],
    bundle: true,
    platform: "node",
    target: BUILD_TARGET,
    format: "esm",
    outfile: path.join(outputDir, "dist", "bundle.js"),
    banner: { js: "// Bundled by clifast" },
  });
}

export async function bundleCLI(cliCode: string, outputDir: string): Promise<void> {
  const require = createRequire(import.meta.url);
  const commanderEntry = require.resolve("commander");
  const parts = commanderEntry.split(path.sep);
  const nodeModulesDir = parts.slice(0, parts.lastIndexOf("node_modules") + 1).join(path.sep);

  const tempFile = path.join(outputDir, "bin", "_cli_src.mjs");
  fs.writeFileSync(tempFile, cliCode);

  try {
    await build({
      entryPoints: [tempFile],
      bundle: true,
      platform: "node",
      target: BUILD_TARGET,
      format: "esm",
      outfile: path.join(outputDir, "bin", "cli.js"),
      external: ["../dist/bundle.js"],
      nodePaths: [nodeModulesDir],
      banner: {
        js: [
          "#!/usr/bin/env node",
          "import { createRequire as __createRequire } from 'node:module';",
          "const require = __createRequire(import.meta.url);",
        ].join("\n"),
      },
    });
  } finally {
    fs.unlinkSync(tempFile);
  }
}
