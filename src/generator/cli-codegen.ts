import { ParamType } from "../parser/types.js";
import type { ParsedFunction } from "../parser/types.js";
import { buildAfterHelpText, paramToOption, buildPositionalMerge } from "./cli-builders.js";

export function generateSingleCLI(fn: ParsedFunction, binName: string, description: string, version: string): string {
  const nonBool = fn.params.filter((p) => p.type !== ParamType.Boolean);
  const options = fn.params.map((p) => paramToOption(p)).join("\n");
  const argList = fn.params.map((p) => `opts['${p.name}']`).join(", ");

  const commanderImports = ["Command"];
  if (fn.params.some((p) => p.choices)) commanderImports.push("Option");

  const fnDescription = fn.deprecated
    ? `[DEPRECATED] ${fn.description || description}`
    : (fn.description || description);

  const afterHelp = buildAfterHelpText(fn, binName);
  const afterHelpLine = afterHelp ? `\n  .addHelpText('after', ${JSON.stringify(afterHelp)})` : "";
  const positionalMerge = buildPositionalMerge(nonBool);

  return `import { ${commanderImports.join(", ")} } from 'commander';
import { ${fn.isDefault ? "default as _fn" : fn.name} } from '../dist/bundle.js';

const program = new Command();

program
  .name(${JSON.stringify(binName)})
  .description(${JSON.stringify(fnDescription)})
  .version(${JSON.stringify(version)})
  .argument('[args...]')
${options}${afterHelpLine}
  .action((_args, opts) => {
${positionalMerge}
    const result = ${fn.isDefault ? "_fn" : fn.name}(${argList});
    if (result instanceof Promise) {
      result.then(r => { if (r !== undefined) console.log(r); }).catch(e => { console.error(e); process.exit(1); });
    } else if (result !== undefined) {
      console.log(result);
    }
  });

program.parse();
`;
}

export function generateMultiCLI(fns: ParsedFunction[], binName: string, description: string, version: string): string {
  const namedImports = fns.filter((f) => !f.isDefault).map((f) => f.name);
  const defaultImport = fns.find((f) => f.isDefault);
  const importParts: string[] = [];
  if (defaultImport) importParts.push("default as _fn_default");
  importParts.push(...namedImports);

  const commanderImports = ["Command"];
  if (fns.some((fn) => fn.params.some((p) => p.choices))) commanderImports.push("Option");

  const commands = fns.map((fn) => {
    const fnRef = fn.isDefault ? "_fn_default" : fn.name;
    const nonBool = fn.params.filter((p) => p.type !== ParamType.Boolean);
    const options = fn.params.map((p) => paramToOption(p)).join("\n");
    const argList = fn.params.map((p) => `opts['${p.name}']`).join(", ");

    const cmdDescription = fn.deprecated
      ? `[DEPRECATED] ${fn.description || fn.name}`
      : (fn.description || fn.name);

    const afterHelp = buildAfterHelpText(fn, binName, fn.name);
    const afterHelpLine = afterHelp ? `\n  .addHelpText('after', ${JSON.stringify(afterHelp)})` : "";
    const positionalMerge = buildPositionalMerge(nonBool);

    return `
program
  .command(${JSON.stringify(fn.name)})
  .description(${JSON.stringify(cmdDescription)})
  .argument('[args...]')
${options}${afterHelpLine}
  .action((_args, opts) => {
${positionalMerge}
    const result = ${fnRef}(${argList});
    if (result instanceof Promise) {
      result.then(r => { if (r !== undefined) console.log(r); }).catch(e => { console.error(e); process.exit(1); });
    } else if (result !== undefined) {
      console.log(result);
    }
  });`;
  }).join("\n");

  return `import { ${importParts.join(", ")} } from '../dist/bundle.js';
import { ${commanderImports.join(", ")} } from 'commander';

const program = new Command();

program
  .name(${JSON.stringify(binName)})
  .description(${JSON.stringify(description)})
  .version(${JSON.stringify(version)});
${commands}

program.parse();
`;
}
