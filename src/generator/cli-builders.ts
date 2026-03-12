import { ParamType } from "../parser/types.js";
import type { ParsedFunction, ParsedParam } from "../parser/types.js";

export function buildDescription(p: ParsedParam): string {
  const parts: string[] = [];
  if (p.description) parts.push(p.description);
  if (!p.choices) {
    if (p.typeLabel) parts.push(`[${p.typeLabel}]`);
    else if (p.type !== ParamType.String && p.type !== ParamType.Boolean) parts.push(`[${p.type}]`);
  }
  return parts.join(" ") || p.name;
}

function exampleValue(p: ParsedParam): string {
  if (p.choices) return p.choices[0];
  switch (p.type) {
    case ParamType.Number: return "42";
    case ParamType.Boolean: return "";
    case ParamType.Object: return "'{\"key\":\"value\"}'";
    case ParamType.Array: return "'[\"a\",\"b\"]'";
    default: return "foo";
  }
}

export function buildAfterHelpText(fn: ParsedFunction, binName: string, commandName?: string): string | undefined {
  const sections: string[] = [];

  if (fn.examples && fn.examples.length > 0) {
    sections.push("Examples:");
    for (const ex of fn.examples) {
      for (const line of ex.split("\n")) sections.push(`  ${line}`);
    }
  } else if (fn.params.length > 0) {
    const prefix = commandName ? `${binName} ${commandName}` : binName;
    const required = fn.params.filter((p) => p.required);
    const paramsToShow = required.length > 0 ? required : fn.params;

    let parts: string[];
    if (commandName) {
      parts = paramsToShow.map((p) =>
        p.type === ParamType.Boolean ? `--${p.name}` : `--${p.name} ${exampleValue(p)}`
      );
    } else {
      const positional = paramsToShow.filter((p) => p.type !== ParamType.Boolean).map((p) => exampleValue(p));
      const flags = paramsToShow.filter((p) => p.type === ParamType.Boolean).map((p) => `--${p.name}`);
      parts = [...positional, ...flags];
    }

    if (parts.length > 0) {
      sections.push("Example:");
      sections.push(`  $ ${prefix} ${parts.join(" ")}`);
    }
  }

  if (fn.returnType) {
    const retDesc = fn.returnDescription ? ` \u2014 ${fn.returnDescription}` : "";
    if (sections.length > 0) sections.push("");
    sections.push(`Returns: ${fn.returnType}${retDesc}`);
  }

  return sections.length > 0 ? "\n" + sections.join("\n") : undefined;
}

export function paramToOption(p: ParsedParam): string {
  const desc = buildDescription(p);

  if (p.choices) {
    const flag = p.required ? `--${p.name} <${p.name}>` : `--${p.name} [${p.name}]`;
    return `  .addOption(new Option('${flag}', ${JSON.stringify(desc)}).choices(${JSON.stringify(p.choices)})${p.defaultValue ? `.default(${p.defaultValue})` : ""})`;
  }

  if (p.type === ParamType.Boolean) {
    return `  .option('--${p.name}', ${JSON.stringify(desc)}${p.defaultValue ? `, ${p.defaultValue}` : ""})`;
  }

  const flag = p.required ? `--${p.name} <${p.name}>` : `--${p.name} [${p.name}]`;
  const coerce = p.type === ParamType.Number ? ", Number" : p.type === ParamType.Object ? ", JSON.parse" : "";
  const def = p.defaultValue ? `, ${p.defaultValue}` : "";
  return `  .option('${flag}', ${JSON.stringify(desc)}${coerce}${def})`;
}

export function buildPositionalMerge(nonBoolParams: ParsedParam[]): string {
  const lines: string[] = [];
  for (let i = 0; i < nonBoolParams.length; i++) {
    const p = nonBoolParams[i];
    const coerce = p.type === ParamType.Number ? "Number" : p.type === ParamType.Object ? "JSON.parse" : "";
    const value = coerce ? `${coerce}(_args[${i}])` : `_args[${i}]`;
    lines.push(`    if (opts['${p.name}'] === undefined && _args[${i}] !== undefined) opts['${p.name}'] = ${value};`);
  }
  return lines.join("\n");
}
