import chalk from "chalk";
import path from "node:path";
import * as printer from "../utils/printer.js";
import type { PackageMeta } from "./detect.js";
import { checkNpmAuth } from "./auth.js";

export function publishSuccessMsg(meta: PackageMeta): void {
  console.log();
  console.log(`${chalk.green.bold("\u2728")} Published ${chalk.bold(meta.name)} ${chalk.green.bold(`v${meta.version}`)}`);
  console.log();
  printer.dim(`  npx ${meta.name} --help`);
  printer.dim(`  npm install -g ${meta.name}`);
  console.log();
}

export function publishErrorMsg(stderr: string, meta: PackageMeta, outputDir: string): void {
  console.log();

  if (
    stderr.includes("EPUBLISHCONFLICT") ||
    stderr.includes("cannot publish over the previously published versions") ||
    (stderr.includes("403") && stderr.includes("already exists"))
  ) {
    printer.error(`v${meta.version} already exists on npm — bump the version first`);
    printer.dim(`  Update "version" in ${path.join(outputDir, "package.json")}`);
  } else if (stderr.includes("403")) {
    printer.error(`You don't have permission to publish "${meta.name}"`);
    const username = checkNpmAuth();
    if (username) {
      printer.dim(`  Try a scoped name: @${username}/${meta.name.replace(/^@[^/]+\//, "")}`);
    }
  } else if (stderr.includes("401") || stderr.includes("ENEEDAUTH")) {
    printer.error("Authentication expired — run npm login");
  } else if (stderr.includes("402")) {
    printer.error("Scoped packages require a paid plan or --access public");
  } else {
    printer.error("Publish failed");
    printer.dim(`  ${stderr.split("\n")[0]}`);
  }

  console.log();
  printer.dim(`  cd ${outputDir} && npm publish`);
}

export function unpublishErrorMsg(stderr: string, meta: PackageMeta): void {
  console.log();

  if (stderr.includes("404") || stderr.includes("not found")) {
    printer.error(`${meta.name} is not published on npm`);
  } else if (stderr.includes("401") || stderr.includes("ENEEDAUTH")) {
    printer.error("Authentication expired — run npm login");
  } else if (stderr.includes("403")) {
    printer.error(`You don't have permission to unpublish "${meta.name}"`);
  } else if (stderr.includes("cannot unpublish") || stderr.includes("24 hours")) {
    printer.error("Can only unpublish within 72 hours of publishing");
    printer.dim("  Use --force to deprecate instead, or contact npm support");
  } else {
    printer.error("Unpublish failed");
    printer.dim(`  ${stderr.split("\n")[0]}`);
  }
}
