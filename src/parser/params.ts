import ts from "typescript";
import { ParamType } from "./types.js";
import type { ParsedParam } from "./types.js";

const PRIMITIVES = new Set([
  "string", "number", "boolean", "any", "unknown", "object", "symbol", "bigint",
]);

const SIMPLE_TYPE_LABELS = ["string", "number", "boolean"];

export function resolveParamType(type: ts.Type, checker: ts.TypeChecker): ParamType {
  if (type.flags & ts.TypeFlags.String || type.flags & ts.TypeFlags.StringLiteral) return ParamType.String;
  if (type.flags & ts.TypeFlags.Number || type.flags & ts.TypeFlags.NumberLiteral) return ParamType.Number;
  if (type.flags & ts.TypeFlags.Boolean || type.flags & ts.TypeFlags.BooleanLiteral) return ParamType.Boolean;
  if (checker.isArrayType(type)) return ParamType.Array;

  if (type.flags & ts.TypeFlags.Object) {
    const objType = type as ts.ObjectType;
    if (
      !(objType.objectFlags & ts.ObjectFlags.Reference && checker.isArrayType(type)) &&
      !type.getCallSignatures().length
    ) {
      return ParamType.Object;
    }
  }

  if (type.isUnion()) {
    const memberTypes = type.types.map((t) => resolveParamType(t, checker));
    if (memberTypes.every((t) => t === ParamType.String)) return ParamType.String;
    if (memberTypes.every((t) => t === ParamType.Number)) return ParamType.Number;
    if (memberTypes.every((t) => t === ParamType.Boolean)) return ParamType.Boolean;
  }

  return ParamType.Unknown;
}

export function getTagText(tag: ts.JSDocTag): string | undefined {
  const { comment } = tag;
  if (!comment) return undefined;
  if (typeof comment === "string") return comment;
  return comment.map((n) => n.text).join("") || undefined;
}

export function extractParam(param: ts.ParameterDeclaration, checker: ts.TypeChecker): ParsedParam {
  const name = param.name.getText();
  const symbol = checker.getSymbolAtLocation(param.name);
  const type = checker.getTypeAtLocation(param);
  const resolvedType = resolveParamType(type, checker);

  const hasDefault = param.initializer !== undefined;
  const isOptional = param.questionToken !== undefined || hasDefault;
  const defaultValue = param.initializer?.getText();

  let description: string | undefined;
  if (symbol) {
    const docs = symbol.getDocumentationComment(checker);
    if (docs.length > 0) description = ts.displayPartsToString(docs);
  }

  let choices: string[] | undefined;
  if (type.isUnion()) {
    const literals = type.types.filter((t) => !!(t.flags & ts.TypeFlags.StringLiteral));
    if (literals.length === type.types.length && literals.length > 0) {
      choices = literals.map((t) => (t as ts.LiteralType).value as string);
    }
  }

  const rawTypeStr = checker.typeToString(type);
  const typeLabel = SIMPLE_TYPE_LABELS.includes(rawTypeStr) ? undefined : rawTypeStr;

  return { name, type: resolvedType, required: !isOptional, defaultValue, description, choices, typeLabel };
}

export function expandTypeForDisplay(type: ts.Type, typeStr: string, checker: ts.TypeChecker): string {
  if (PRIMITIVES.has(typeStr)) return typeStr;
  if (/[<>{}\[\]|&]/.test(typeStr)) return typeStr;

  const properties = type.getProperties();
  if (properties.length === 0) return typeStr;

  const members = properties.map((prop) => {
    const propType = checker.getTypeOfSymbol(prop);
    const propStr = checker.typeToString(propType, undefined, ts.TypeFormatFlags.NoTruncation);
    return `${prop.name}: ${propStr}`;
  });

  return `{ ${members.join("; ")} }`;
}
