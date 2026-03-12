import fs from "node:fs";
import path from "node:path";
import type { GeneratorConfig, ParsedModule } from "../parser/types.js";
import { generateSingleCLI, generateMultiCLI } from "./cli-codegen.js";
import { bundleUserCode, bundleCLI } from "./bundler.js";
import { generatePackageJson } from "./package-gen.js";
import { generateReadme } from "./readme-gen.js";

const EXECUTABLE_PERMISSIONS = 0o755;

export async function scaffold(module: ParsedModule, config: GeneratorConfig): Promise<void> {
  const { outputDir } = config;
  const { functions, externalDeps } = module;

  if (functions.length === 0) throw new Error("No exported functions found in input file.");

  fs.mkdirSync(path.join(outputDir, "bin"), { recursive: true });
  fs.mkdirSync(path.join(outputDir, "dist"), { recursive: true });

  const isSingle = functions.length === 1;
  const cliCode = isSingle
    ? generateSingleCLI(functions[0], config.binName, config.description, config.version)
    : generateMultiCLI(functions, config.binName, config.description, config.version);

  await bundleUserCode(module.filePath, outputDir);
  await bundleCLI(cliCode, outputDir);

  fs.writeFileSync(path.join(outputDir, "package.json"), generatePackageJson(config, externalDeps));
  fs.writeFileSync(path.join(outputDir, "README.md"), generateReadme(config, functions));
  fs.chmodSync(path.join(outputDir, "bin", "cli.js"), EXECUTABLE_PERMISSIONS);
}
