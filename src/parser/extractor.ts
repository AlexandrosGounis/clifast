import ts from "typescript";
import { JsDocTag } from "./types.js";
import type { ParsedFunction } from "./types.js";
import { getTagText, extractParam, expandTypeForDisplay } from "./params.js";

function extractFunction(
  node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression,
  name: string,
  isDefault: boolean,
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
): ParsedFunction {
  const params = node.parameters.map((p) => extractParam(p, checker));
  const isAsync = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;

  let description: string | undefined;
  const symbol = checker.getSymbolAtLocation(
    ts.isVariableDeclaration(node.parent) ? node.parent.name : node.name ?? node,
  );
  if (symbol) {
    const docs = symbol.getDocumentationComment(checker);
    if (docs.length > 0) description = ts.displayPartsToString(docs);
  }

  const parent = node.parent;
  const statement = ts.isVariableDeclaration(parent) ? parent.parent?.parent : node;

  if (!description && statement) {
    const fullText = sourceFile.getFullText();
    const ranges = ts.getLeadingCommentRanges(fullText, statement.getFullStart());
    if (ranges) {
      for (const range of ranges) {
        const comment = fullText.slice(range.pos, range.end);
        const match = comment.match(/\/\*\*\s*\n?\s*\*?\s*(.+?)(?:\n|\*\/)/);
        if (match) description = match[1].trim();
      }
    }
  }

  let returnType: string | undefined;
  const signature = checker.getSignatureFromDeclaration(node);
  if (signature) {
    let tsReturnType = checker.getReturnTypeOfSignature(signature);
    const rawReturnStr = checker.typeToString(tsReturnType, undefined, ts.TypeFormatFlags.NoTruncation);

    if (rawReturnStr.startsWith("Promise<")) {
      const typeRef = tsReturnType as ts.TypeReference;
      if (typeRef.typeArguments?.length) tsReturnType = typeRef.typeArguments[0];
    }

    const returnStr = checker.typeToString(tsReturnType, undefined, ts.TypeFormatFlags.NoTruncation);
    if (returnStr !== "void" && returnStr !== "undefined" && returnStr !== "never") {
      returnType = expandTypeForDisplay(tsReturnType, returnStr, checker);
    }
  }

  let returnDescription: string | undefined;
  const examples: string[] = [];
  let deprecated: string | undefined;

  if (statement) {
    for (const tag of ts.getJSDocTags(statement)) {
      const text = getTagText(tag);
      switch (tag.tagName.text) {
        case JsDocTag.Returns:
        case JsDocTag.Return:
          if (text) returnDescription = text;
          break;
        case JsDocTag.Example:
          if (text) examples.push(text.trim());
          break;
        case JsDocTag.Deprecated:
          deprecated = text || "Deprecated";
          break;
      }
    }
  }

  return {
    name, description, params, isDefault, isAsync,
    returnType, returnDescription,
    examples: examples.length > 0 ? examples : undefined,
    deprecated,
  };
}

export function extractExports(filePath: string): ParsedFunction[] {
  const program = ts.createProgram([filePath], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowJs: true,
    strict: false,
  });

  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) throw new Error(`Could not parse file: ${filePath}`);

  const checker = program.getTypeChecker();
  const functions: ParsedFunction[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name && hasExportModifier(node)) {
      functions.push(extractFunction(node, node.name.getText(), hasDefaultModifier(node), checker, sourceFile));
      return;
    }

    if (ts.isFunctionDeclaration(node) && !node.name && hasDefaultModifier(node)) {
      functions.push(extractFunction(node, "default", true, checker, sourceFile));
      return;
    }

    if (ts.isVariableStatement(node) && hasExportModifier(node)) {
      for (const decl of node.declarationList.declarations) {
        if (
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) &&
          ts.isIdentifier(decl.name)
        ) {
          functions.push(extractFunction(decl.initializer, decl.name.text, false, checker, sourceFile));
        }
      }
    }
  });

  return functions;
}

function hasExportModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) &&
    (ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false);
}

function hasDefaultModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) &&
    (ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ?? false);
}
