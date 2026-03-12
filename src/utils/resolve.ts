import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as printer from "./printer.js";

const SUPPORTED_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];

export function getNpmUsername(): string | null {
  try {
    return execFileSync("npm", ["whoami"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

export function getExistingVersion(outputDir: string): string | null {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(outputDir, "package.json"), "utf-8"));
    return pkg.version || null;
  } catch {
    return null;
  }
}

export function resolveInputFile(file: string): string {
  const resolved = path.resolve(file);

  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    assertSupportedExtension(resolved);
    return resolved;
  }

  for (const ext of SUPPORTED_EXTENSIONS) {
    const withExt = resolved + ext;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) return withExt;
  }

  printer.error(`File not found: ${resolved}`);
  process.exit(1);
}

function assertSupportedExtension(filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    printer.error("Only JavaScript and TypeScript files are supported at the moment. Rest is coming soon \uD83D\uDC40");
    process.exit(1);
  }
}
