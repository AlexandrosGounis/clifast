import { select } from "@inquirer/prompts";
import chalk from "chalk";
import path from "node:path";
import type { GeneratorConfig } from "../parser/types.js";
import type { PromptConfig } from "../utils/types.js";
import { DEFAULT_REGISTRY } from "../utils/constants.js";
import { promptBasic } from "./basic.js";
import { promptPublishing } from "./publishing.js";
import { promptAdvanced } from "./advanced.js";
import * as printer from "../utils/printer.js";

function getDefaults(
  inputFile: string,
  partial: Partial<GeneratorConfig>
): GeneratorConfig {
  const baseName = path.basename(inputFile, path.extname(inputFile));
  return {
    packageName: partial.packageName || baseName,
    version: partial.version || "1.0.0",
    description: partial.description || "",
    outputDir: partial.outputDir || partial.packageName || baseName,
    binName: partial.binName || partial.packageName || baseName,
    author: partial.author || "",
    license: partial.license || "MIT",
    keywords: partial.keywords || [],
    registry: partial.registry || DEFAULT_REGISTRY,
    minNodeVersion: partial.minNodeVersion || "18",
    isPrivate: partial.isPrivate ?? false,
  };
}

export async function runPromptFlow(
  promptConfig: PromptConfig
): Promise<GeneratorConfig> {
  const defaults = getDefaults(promptConfig.inputFile, promptConfig);

  if (promptConfig.yes) {
    return defaults;
  }

  printer.step(1, "Package basics");
  const basic = await promptBasic(promptConfig.inputFile, defaults);
  const config: GeneratorConfig = { ...defaults, ...basic };

  printer.step(2, "Configure");

  let donePublishing = false;
  let doneAdvanced = false;

  while (true) {
    const choice = await select({
      message: "What's next?",
      choices: [
        {
          name: chalk.green.bold("\u2728 Generate package"),
          value: "done" as const,
        },
        {
          name: donePublishing
            ? `\uD83D\uDCE6 Publishing ${chalk.green("\u2714")}`
            : `\uD83D\uDCE6 Publishing ${chalk.dim("\u2014 author, license, keywords")}`,
          value: "publishing" as const,
        },
        {
          name: doneAdvanced
            ? `\u2699\uFE0F  Advanced ${chalk.green("\u2714")}`
            : `\u2699\uFE0F  Advanced ${chalk.dim("\u2014 binary name, node version")}`,
          value: "advanced" as const,
        },
      ],
    });

    if (choice === "done") break;

    if (choice === "publishing") {
      console.log();
      const pub = await promptPublishing(config);
      Object.assign(config, pub);
      donePublishing = true;
      console.log();
    }

    if (choice === "advanced") {
      console.log();
      const adv = await promptAdvanced({
        ...config,
        packageName: config.packageName,
      });
      Object.assign(config, adv);
      doneAdvanced = true;
      console.log();
    }
  }

  if (!doneAdvanced && !promptConfig.binName) {
    config.binName = config.packageName;
  }

  return config;
}
