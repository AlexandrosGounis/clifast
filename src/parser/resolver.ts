import ts from "typescript";
import type { ExternalDep } from "./types.js";

export function resolveExternalDeps(filePath: string): ExternalDep[] {
  const program = ts.createProgram([filePath], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowJs: true,
  });

  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) return [];

  const deps: ExternalDep[] = [];
  const seen = new Set<string>();

  ts.forEachChild(sourceFile, (node) => {
    let specifier: string | undefined;

    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      specifier = node.moduleSpecifier.text;
    }

    if (ts.isVariableStatement(node) || ts.isExpressionStatement(node)) {
      ts.forEachChild(node, function visit(child) {
        if (
          ts.isCallExpression(child) &&
          ts.isIdentifier(child.expression) &&
          child.expression.text === "require" &&
          child.arguments.length === 1 &&
          ts.isStringLiteral(child.arguments[0])
        ) {
          specifier = (child.arguments[0] as ts.StringLiteral).text;
        }
        ts.forEachChild(child, visit);
      });
    }

    if (specifier && !isRelative(specifier) && !isNodeBuiltin(specifier)) {
      const pkgName = extractPackageName(specifier);
      if (!seen.has(pkgName)) {
        seen.add(pkgName);
        deps.push({ name: pkgName, specifier });
      }
    }
  });

  return deps;
}

function isRelative(specifier: string): boolean {
  return specifier.startsWith(".") || specifier.startsWith("/");
}

function isNodeBuiltin(specifier: string): boolean {
  if (specifier.startsWith("node:")) return true;
  const builtins = new Set([
    "assert", "buffer", "child_process", "cluster", "console", "constants",
    "crypto", "dgram", "dns", "domain", "events", "fs", "http", "http2",
    "https", "module", "net", "os", "path", "perf_hooks", "process",
    "punycode", "querystring", "readline", "repl", "stream", "string_decoder",
    "sys", "timers", "tls", "tty", "url", "util", "v8", "vm", "worker_threads",
    "zlib",
  ]);
  return builtins.has(specifier.split("/")[0]);
}

function extractPackageName(specifier: string): string {
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    return parts.slice(0, 2).join("/");
  }
  return specifier.split("/")[0];
}
