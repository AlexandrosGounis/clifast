export enum ParamType {
  String = "string",
  Number = "number",
  Boolean = "boolean",
  Array = "array",
  Object = "object",
  Unknown = "unknown",
}

export enum JsDocTag {
  Returns = "returns",
  Return = "return",
  Example = "example",
  Deprecated = "deprecated",
}

export interface ParsedParam {
  name: string;
  type: ParamType;
  required: boolean;
  defaultValue?: string;
  description?: string;
  choices?: string[];
  typeLabel?: string;
}

export interface ParsedFunction {
  name: string;
  description?: string;
  params: ParsedParam[];
  isDefault: boolean;
  isAsync: boolean;
  returnType?: string;
  returnDescription?: string;
  examples?: string[];
  deprecated?: string;
}

export interface ExternalDep {
  name: string;
  specifier: string;
}

export interface ParsedModule {
  filePath: string;
  functions: ParsedFunction[];
  externalDeps: ExternalDep[];
}

export interface GeneratorConfig {
  packageName: string;
  version: string;
  description: string;
  outputDir: string;
  binName: string;
  author: string;
  license: string;
  keywords: string[];
  registry: string;
  minNodeVersion: string;
  isPrivate: boolean;
}
