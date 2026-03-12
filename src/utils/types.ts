import type { GeneratorConfig } from "../parser/types.js";

export type PromptConfig = Partial<GeneratorConfig> & {
  inputFile: string;
  yes: boolean;
};
