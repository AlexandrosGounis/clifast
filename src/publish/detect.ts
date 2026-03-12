import fs from "node:fs";
import path from "node:path";
import * as printer from "../utils/printer.js";
import { DEFAULT_REGISTRY } from "../utils/constants.js";

export interface PackageMeta {
  name: string;
  version: string;
  license: string;
  author: string;
  binName: string;
  registry: string;
  isPrivate: boolean;
}

export function readPackageMeta(dir: string): PackageMeta {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"));
  return {
    name: raw.name,
    version: raw.version,
    license: raw.license || "MIT",
    author: raw.author || "",
    binName: raw.bin ? Object.keys(raw.bin)[0] : raw.name,
    registry: raw.publishConfig?.registry || DEFAULT_REGISTRY,
    isPrivate: raw.private === true,
  };
}

function isClifastPackage(dir: string): boolean {
  return (
    fs.existsSync(path.join(dir, "package.json")) &&
    fs.existsSync(path.join(dir, "bin", "cli.js")) &&
    fs.existsSync(path.join(dir, "dist", "bundle.js"))
  );
}

export function detectPackageDir(): string {
  if (isClifastPackage(".")) return path.resolve(".");

  const candidates = fs
    .readdirSync(".", { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => isClifastPackage(name));

  if (candidates.length === 0) {
    printer.error("No publishable package found");
    printer.dim("  Run clifast <file> first to generate one");
    process.exit(1);
  }

  if (candidates.length > 1) {
    printer.error("Multiple packages found — specify which one:");
    for (const name of candidates) printer.dim(`  clifast publish ${name}`);
    process.exit(1);
  }

  return path.resolve(candidates[0]);
}
