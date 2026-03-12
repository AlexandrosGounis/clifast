import { execFileSync, spawnSync } from "node:child_process";

export function checkNpmAuth(): string | null {
  try {
    return execFileSync("npm", ["whoami"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

export function runNpmLogin(): boolean {
  return spawnSync("npm", ["login"], { stdio: "inherit" }).status === 0;
}

export function needs2FA(stderr: string): boolean {
  return (
    stderr.includes("two-factor authentication") ||
    stderr.includes("EOTP") ||
    stderr.includes("one-time pass") ||
    stderr.includes("2fa") ||
    (stderr.includes("403") && stderr.includes("bypass 2fa"))
  );
}
