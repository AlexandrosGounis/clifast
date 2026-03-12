import { ParamType } from "../parser/types.js";
import type { GeneratorConfig, ParsedFunction } from "../parser/types.js";

function kebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

export function generateReadme(config: GeneratorConfig, functions: ParsedFunction[]): string {
  const isSingle = functions.length === 1;
  const binName = config.binName;

  let usage = "";

  if (isSingle) {
    const fn = functions[0];
    const positional = fn.params
      .filter((p) => p.type !== ParamType.Boolean)
      .map((p) => (p.required ? `<${p.name}>` : `[${p.name}]`))
      .join(" ");
    const flags = fn.params
      .filter((p) => p.type === ParamType.Boolean)
      .map((p) => `[--${kebab(p.name)}]`)
      .join(" ");

    usage = `\`\`\`\nnpx ${binName} ${positional} ${flags}\n\`\`\``;

    if (fn.params.length > 0) {
      usage += "\n\n### Arguments\n\n";
      usage += "| Argument | Type | Required | Description |\n";
      usage += "|----------|------|----------|-------------|\n";
      for (const p of fn.params) {
        usage += `| \`${p.name}\` | ${p.type} | ${p.required ? "Yes" : "No"} | ${p.description || "-"} |\n`;
      }
    }
  } else {
    usage = "### Commands\n\n";
    for (const fn of functions) {
      usage += `#### \`${binName} ${fn.name}\`\n\n`;
      if (fn.description) usage += `${fn.description}\n\n`;
      if (fn.params.length > 0) {
        usage += "| Option | Type | Required | Description |\n";
        usage += "|--------|------|----------|-------------|\n";
        for (const p of fn.params) {
          usage += `| \`--${kebab(p.name)}\` | ${p.type} | ${p.required ? "Yes" : "No"} | ${p.description || "-"} |\n`;
        }
        usage += "\n";
      }
    }
  }

  return `# ${config.packageName}

${config.description}

## Installation

\`\`\`
npm install -g ${config.packageName}
\`\`\`

## Usage

${usage}

## License

${config.license}
`;
}
