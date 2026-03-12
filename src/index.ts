import { Command } from "commander";
import { spawn } from "node:child_process";
import { confirm, input } from "@inquirer/prompts";
import chalk from "chalk";
import path from "node:path";
import fs from "node:fs";
import semver from "semver";
import { extractExports } from "./parser/extractor.js";
import { resolveExternalDeps } from "./parser/resolver.js";
import { scaffold } from "./generator/scaffold.js";
import { publishPackage, unpublishPackage, detectPackageDir } from "./publish/publisher.js";
import * as printer from "./utils/printer.js";
import { getNpmUsername, getExistingVersion, resolveInputFile } from "./utils/resolve.js";
import { DEFAULT_REGISTRY } from "./utils/constants.js";
import { ParamType, type ParsedModule, type GeneratorConfig } from "./parser/types.js";

const program = new Command();

program
  .name("clifast")
  .description("Generate a ready-to-publish npm CLI from TypeScript/JavaScript exports")
  .version("0.1.0");

program
  .command("generate", { isDefault: true })
  .argument("<file>", "TypeScript or JavaScript file")
  .option("-y, --yes", "skip prompts, use defaults", false)
  .option("-p, --publish", "publish after generating", false)
  .option("-n, --name <name>", "package name")
  .option("-o, --output <dir>", "output directory")
  .option("-d, --description <desc>", "package description")
  .action(async (file: string, opts: Record<string, string | boolean>) => {
    const inputFile = resolveInputFile(file);
    const functions = extractExports(inputFile);
    const externalDeps = resolveExternalDeps(inputFile);

    if (functions.length === 0) {
      console.log(chalk.blue("\nNo exported functions found. Export at least one function to create a CLI for it.\n"));
      process.exit(1);
    }

    console.log();
    printer.success(
      `Found ${functions.length} exported function${functions.length > 1 ? "s" : ""}: ${functions.map((f) => chalk.bold(f.name)).join(", ")}`,
    );

    const module: ParsedModule = { filePath: inputFile, functions, externalDeps };
    const baseName = path.basename(inputFile, path.extname(inputFile));
    const npmUser = getNpmUsername();
    const defaultName = (opts.name as string) || (npmUser ? `@${npmUser}/${baseName}` : baseName);
    const defaultOutputDir = (opts.output as string) || baseName;
    const existingVersion = getExistingVersion(path.resolve(defaultOutputDir));
    const defaultVersion = existingVersion ? semver.inc(existingVersion, "patch") || "1.0.0" : "1.0.0";

    let packageName: string;
    let description: string;
    let version: string;

    if (opts.yes) {
      packageName = defaultName;
      description = (opts.description as string) || "";
      version = defaultVersion;
    } else {
      packageName = await input({ message: "name:", default: defaultName });
      description = await input({ message: "description:", default: (opts.description as string) || "" });
      const versionHint = existingVersion ? `${chalk.dim(`(current: v${existingVersion})`)}` : "";
      version = await input({ message: `version: ${versionHint}`, default: defaultVersion });
    }

    const binName = packageName.replace(/^@[^/]+\//, "");
    const config: GeneratorConfig = {
      packageName, version, description,
      outputDir: path.resolve((opts.output as string) || binName),
      binName, author: npmUser || "", license: "MIT",
      keywords: [], registry: DEFAULT_REGISTRY,
      minNodeVersion: "18", isPrivate: false,
    };

    await scaffold(module, config);

    const fn = functions[0];
    const sampleArgs = fn.params
      .filter((p) => p.required)
      .map((p) => {
        if (p.type === ParamType.Boolean) return `--${p.name}`;
        return p.typeLabel ? `<${p.typeLabel}>` : `<${p.type}>`;
      })
      .join(" ");
    const fnArg = functions.length > 1 ? ` ${fn.name}` : "";
    const testCmd = `clifast test ${path.basename(config.outputDir)}${fnArg}${sampleArgs ? " " + sampleArgs : ""}`;

    if (opts.publish) {
      console.log(`${chalk.blue.bold("\uD83D\uDCE6 CLI generated at")} ${chalk.blue.bold(config.outputDir)}`);
      await publishPackage(config.outputDir);
      console.log();
      console.log(`${chalk.green("\u2714")} ${chalk.green("Done.")} ${chalk.dim("Test with")} ${chalk.bgHex("#0a3d0a").green.bold(` ${testCmd} `)}`);
      return;
    }

    console.log(`${chalk.blue.bold("\uD83D\uDCE6 CLI generated at")} ${chalk.blue.bold(config.outputDir)}`);

    if (!opts.yes) {
      const wantPublish = await confirm({
        message: `${chalk.green("Ready to publish")} \u2014 publish now?`,
        default: false,
      });
      if (wantPublish) await publishPackage(config.outputDir);
    }

    console.log();
    console.log(`${chalk.green("\u2714")} ${chalk.green("Done.")} ${chalk.dim("Test with")} ${chalk.bgHex("#0a3d0a").green.bold(` ${testCmd} `)}`);
  });

program
  .command("publish")
  .description("Publish a generated package to npm")
  .argument("[folder]", "package folder (auto-detected if omitted)")
  .action(async (folder?: string) => {
    const dir = folder ? path.resolve(folder) : detectPackageDir();
    if (!fs.existsSync(path.join(dir, "package.json"))) {
      printer.error(`No package.json found in ${dir}`);
      process.exit(1);
    }
    await publishPackage(dir);
  });

program
  .command("unpublish")
  .description("Unpublish a package from npm")
  .argument("[folder]", "package folder (auto-detected if omitted)")
  .option("-f, --force", "unpublish all versions", false)
  .action(async (folder?: string, opts?: { force: boolean }) => {
    const dir = folder ? path.resolve(folder) : detectPackageDir();
    if (!fs.existsSync(path.join(dir, "package.json"))) {
      printer.error(`No package.json found in ${dir}`);
      process.exit(1);
    }
    await unpublishPackage(dir, opts?.force ?? false);
  });

program
  .command("test")
  .description("Run a generated CLI locally")
  .argument("<name>", "generated package folder")
  .argument("[args...]", "arguments to forward")
  .allowUnknownOption(true)
  .helpOption(false)
  .action((name: string) => {
    const cliPath = path.resolve(name, "bin", "cli.js");
    if (!fs.existsSync(cliPath)) {
      printer.error(`No CLI found at ${cliPath}`);
      printer.dim("  Run clifast <file> first to generate one.");
      process.exit(1);
    }
    const rawArgs = process.argv.slice(process.argv.indexOf(name) + 1);
    const child = spawn(process.execPath, [cliPath, ...rawArgs], { stdio: "inherit" });
    child.on("exit", (code) => process.exit(code ?? 0));
  });

program.parse();
