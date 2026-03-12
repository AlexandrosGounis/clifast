import { input, confirm } from "@inquirer/prompts";

export async function promptAdvanced(defaults: {
  binName?: string;
  minNodeVersion?: string;
  isPrivate?: boolean;
  packageName: string;
}): Promise<{
  binName: string;
  minNodeVersion: string;
  isPrivate: boolean;
}> {
  const binName = await input({
    message: "Binary name:",
    default: defaults.binName || defaults.packageName,
  });

  const minNodeVersion = await input({
    message: "Minimum Node.js version:",
    default: defaults.minNodeVersion || "18",
  });

  const isPrivate = await confirm({
    message: "Mark as private?",
    default: defaults.isPrivate ?? false,
  });

  return { binName, minNodeVersion, isPrivate };
}
