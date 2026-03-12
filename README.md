# clifast

**Turn any function into a CLI. Instantly.**

Export a function. Run one command. Get a published npm CLI.

&nbsp;

<!-- GIF here -->

&nbsp;

## Try it now

```
npx clifast your-file.ts
```

Or install globally:

```
npm install -g clifast
```

## Usage

```
clifast <file>              # interactive
clifast <file> -y           # skip prompts, use defaults
clifast <file> -y -p        # generate + publish in one shot
```

## How it works

```ts
// math.ts
export function add(a: number, b: number) {
  return a + b;
}
```

```
$ clifast math.ts -y
$ npx math 2 3
5
```

Types map directly to CLI behavior:

| TypeScript | CLI |
|---|---|
| `name: string` | positional arg |
| `count: number` | auto-coerced to number |
| `verbose: boolean` | `--verbose` flag |
| `format?: string` | optional |
| `level = "info"` | default value |
| `"a" \| "b"` | validated choices |
| `async function` | awaited automatically |

Multiple exports become subcommands. JSDoc becomes `--help` text. External imports are auto-bundled.

## Commands

| Command | Description |
|---|---|
| `clifast <file>` | Generate a CLI package from exported functions |
| `clifast publish [folder]` | Publish to npm (handles 2FA, scoped packages) |
| `clifast unpublish [folder]` | Unpublish from npm (`--force` for all versions) |
| `clifast test <folder> [args...]` | Run a generated CLI locally |

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
