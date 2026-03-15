# clifast

**Turn any function into a CLI. Instantly.**

Export a function. Run one command. Get a published npm CLI that can be used by LLMs with minimal token consumption compared to MCP.

![demo](https://raw.githubusercontent.com/AlexandrosGounis/clifast/main/assets/demo.gif)

## Try it now

```shell
npx clifast your-file.ts
# or install globally
npm install -g clifast
```

## Usage

```
clifast <file>              # interactive
clifast <file> -y           # skip prompts, use defaults
```

## How it works

```ts
// math.ts
export function add(a: number, b: number) {
  return a + b;
}
```

```shell
% clifast math.ts -y
$ npx math 2 3
5
```

This will parse the exported functions and build a `—-help` command that explains what the function does based on the types and comments, if any.

### Rules

- Make sure your file **contains at least one exported function**
- Multiple exports become subcommands
- JSDoc comments and proper types are injected in the `--help` command
- External imports are auto-bundled. You can create a CLI for an entire repository by using a single file as the entrypoint

## Commands

| Command                           | Description                                     |
| --------------------------------- | ----------------------------------------------- |
| `clifast <file>`                  | Generate a CLI package from exported functions  |
| `clifast publish [folder]`        | Publish to npm (handles 2FA, scoped packages)   |
| `clifast unpublish [folder]`      | Unpublish from npm (`--force` for all versions) |
| `clifast test <folder> [args...]` | Run a generated CLI locally                     |

## What it generates

```
my-tool/
  bin/cli.js       # executable CLI
  dist/bundle.js   # your code, bundled with esbuild
  package.json     # ready to publish
  README.md        # auto-generated docs
```

## License

MIT
