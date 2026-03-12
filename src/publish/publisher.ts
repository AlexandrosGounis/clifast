import { execFileSync, spawnSync } from "node:child_process";
import { confirm, input } from "@inquirer/prompts";
import chalk from "chalk";
import * as printer from "../utils/printer.js";
import { DEFAULT_REGISTRY } from "../utils/constants.js";
import type { PackageMeta } from "./detect.js";
import { readPackageMeta } from "./detect.js";
import { checkNpmAuth, runNpmLogin, needs2FA } from "./auth.js";
import { publishSuccessMsg, publishErrorMsg, unpublishErrorMsg } from "./messages.js";

export { detectPackageDir } from "./detect.js";

async function runNpmPublish(outputDir: string, meta: PackageMeta): Promise<void> {
  const baseArgs = ["publish", "--access", "public"];
  if (meta.registry !== DEFAULT_REGISTRY) {
    baseArgs.push("--registry", meta.registry);
  }

  try {
    execFileSync("npm", baseArgs, { cwd: outputDir, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    publishSuccessMsg(meta);
    return;
  } catch (e: any) {
    const stderr: string = e.stderr || e.message || "";
    if (!needs2FA(stderr)) {
      publishErrorMsg(stderr, meta, outputDir);
      return;
    }
  }

  console.log();
  printer.info("2FA required \u2014 opening browser to verify...");
  console.log();

  const webResult = spawnSync("npm", [...baseArgs, "--auth-type=web"], { cwd: outputDir, stdio: "inherit" });
  if (webResult.status === 0) {
    publishSuccessMsg(meta);
    return;
  }

  console.log();
  const code = await input({ message: "Enter one-time password (from authenticator app):" });

  try {
    execFileSync("npm", [...baseArgs, "--otp", code.trim()], { cwd: outputDir, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    publishSuccessMsg(meta);
  } catch (e: any) {
    publishErrorMsg(e.stderr || e.message || "", meta, outputDir);
  }
}

export async function publishPackage(outputDir: string): Promise<void> {
  const meta = readPackageMeta(outputDir);

  printer.banner("\uD83D\uDCE6 Publish to npm");
  printer.step(1, "Check npm account");

  let username = checkNpmAuth();

  if (!username) {
    printer.warn("Not logged in to npm");
    console.log();

    const wantLogin = await confirm({
      message: `Log in now? ${chalk.dim("(opens browser)")}`,
      default: true,
    });

    if (!wantLogin) {
      console.log();
      printer.dim(`  Run ${chalk.bold("npm login")} then ${chalk.bold("clifast publish")}`);
      return;
    }

    console.log();
    printer.info("Opening browser to log in...");
    if (!runNpmLogin()) {
      console.log();
      printer.error("Login failed");
      printer.dim(`  cd ${outputDir} && npm publish`);
      return;
    }

    console.log();
    username = checkNpmAuth();
    if (!username) {
      printer.error("Could not verify authentication");
      return;
    }
  }

  printer.success(`Logged in as ${chalk.bold(username)}`);
  printer.step(2, "Review");

  printer.label("Name:    ", chalk.bold(meta.name));
  printer.label("Version: ", chalk.bold(meta.version));
  printer.label("License: ", meta.license);
  if (meta.author) printer.label("Author:  ", meta.author);
  if (meta.registry !== DEFAULT_REGISTRY) {
    printer.label("Registry:", chalk.dim(meta.registry));
  }
  console.log();

  if (meta.isPrivate) {
    printer.warn("Package is marked private \u2014 skipping publish");
    printer.dim('  Remove "private": true from package.json to publish');
    return;
  }

  const ready = await confirm({
    message: `Publish ${chalk.bold(meta.name)}@${meta.version}?`,
    default: true,
  });

  if (!ready) {
    console.log();
    printer.dim(`  cd ${outputDir} && npm publish`);
    return;
  }

  printer.step(3, "Publish");
  try { await runNpmPublish(outputDir, meta); } catch {}
}

export async function unpublishPackage(outputDir: string, force: boolean): Promise<void> {
  const meta = readPackageMeta(outputDir);

  if (!checkNpmAuth()) {
    printer.error("Not logged in to npm \u2014 run npm login first");
    process.exit(1);
  }

  const pkg = force ? meta.name : `${meta.name}@${meta.version}`;

  if (!force) {
    console.log();
    const ok = await confirm({ message: `Unpublish ${chalk.bold(pkg)}?`, default: false });
    if (!ok) return;
  }

  try {
    const args = ["unpublish", pkg];
    if (force) args.push("--force");
    execFileSync("npm", args, { cwd: outputDir, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    console.log();
    console.log(`${chalk.green("\u2714")} Unpublished ${chalk.bold(pkg)}`);
  } catch (e: any) {
    unpublishErrorMsg(e.stderr || e.message || "", meta);
  }
}
