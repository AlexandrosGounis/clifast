import { input } from "@inquirer/prompts";
import { execFileSync } from "node:child_process";
import { DEFAULT_REGISTRY } from "../utils/constants.js";

export async function promptPublishing(defaults: {
  author?: string;
  license?: string;
  keywords?: string[];
  registry?: string;
}): Promise<{
  author: string;
  license: string;
  keywords: string[];
  registry: string;
}> {
  const gitAuthor = getGitAuthor();

  const author = await input({
    message: "Author:",
    default: defaults.author || gitAuthor || "",
  });

  const license = await input({
    message: "License:",
    default: defaults.license || "MIT",
  });

  const keywordsStr = await input({
    message: "Keywords (comma-separated):",
    default: defaults.keywords?.join(", ") || "",
  });

  const keywords = keywordsStr
    ? keywordsStr.split(",").map((k) => k.trim()).filter(Boolean)
    : [];

  const registry = await input({
    message: "Registry URL:",
    default: defaults.registry || DEFAULT_REGISTRY,
  });

  return { author, license, keywords, registry };
}

function getGitAuthor(): string | undefined {
  try {
    const name = execFileSync("git", ["config", "user.name"], { encoding: "utf-8" }).trim();
    const email = execFileSync("git", ["config", "user.email"], { encoding: "utf-8" }).trim();
    return email ? `${name} <${email}>` : name;
  } catch {
    return undefined;
  }
}
