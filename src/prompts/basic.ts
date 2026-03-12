import { input } from "@inquirer/prompts";
import path from "node:path";
import type { GeneratorConfig } from "../parser/types.js";

export async function promptBasic(
  inputFile: string,
  defaults: Partial<GeneratorConfig>
): Promise<Pick<GeneratorConfig, "packageName" | "version" | "description" | "outputDir">> {
  const baseName = path.basename(inputFile, path.extname(inputFile));
  const defaultName = defaults.packageName || baseName;

  const packageName = await input({
    message: "Package name:",
    default: defaultName,
  });

  const version = await input({
    message: "Version:",
    default: defaults.version || "1.0.0",
  });

  const description = await input({
    message: "Description:",
    default: defaults.description || "",
  });

  const outputDir = await input({
    message: "Output directory:",
    default: defaults.outputDir || packageName,
  });

  return { packageName, version, description, outputDir };
}
