import chalk from "chalk";

export function success(msg: string): void {
  console.log(`${chalk.green("✔")} ${msg}`);
}

export function warn(msg: string): void {
  console.log(`${chalk.yellow("⚠")} ${msg}`);
}

export function error(msg: string): void {
  console.error(`${chalk.red("✖")} ${msg}`);
}

export function info(msg: string): void {
  console.log(`${chalk.cyan("ℹ")} ${msg}`);
}

export function heading(msg: string): void {
  console.log(`\n${chalk.bold(msg)}`);
}

export function dim(msg: string): void {
  console.log(chalk.dim(msg));
}

export function step(num: number, label: string): void {
  console.log(
    `\n  ${chalk.bgCyan.black.bold(` ${num} `)} ${chalk.bold(label)}\n`
  );
}

export function label(key: string, value: string): void {
  console.log(`  ${chalk.dim(key)} ${value}`);
}

export function banner(title: string): void {
  console.log(`\n  ${chalk.cyan.bold(title)}`);
  console.log(`  ${chalk.dim("─".repeat(title.length))}\n`);
}
