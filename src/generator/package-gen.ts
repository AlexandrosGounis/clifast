import { DEFAULT_REGISTRY } from "../utils/constants.js";
import type { GeneratorConfig, ExternalDep } from "../parser/types.js";

export function generatePackageJson(config: GeneratorConfig, externalDeps: ExternalDep[]): string {
  const pkg: Record<string, unknown> = {
    name: config.packageName,
    version: config.version,
    description: config.description,
    type: "module",
    bin: {
      [config.binName]: "./bin/cli.js",
      ...(config.packageName !== config.binName ? { [config.packageName]: "./bin/cli.js" } : {}),
    },
    files: ["bin", "dist"],
    dependencies: {} as Record<string, string>,
    engines: { node: `>=${config.minNodeVersion}` },
    license: config.license,
  };

  if (config.author) pkg.author = config.author;
  if (config.keywords.length > 0) pkg.keywords = config.keywords;
  if (config.isPrivate) pkg.private = true;
  if (config.registry !== DEFAULT_REGISTRY) {
    pkg.publishConfig = { registry: config.registry };
  }

  const deps = pkg.dependencies as Record<string, string>;
  for (const dep of externalDeps) {
    if (dep.name !== "commander") deps[dep.name] = "*";
  }

  return JSON.stringify(pkg, null, 2) + "\n";
}
