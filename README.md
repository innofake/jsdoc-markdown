# @innofake/jsdoc-markdown

JSDoc Markdown is a tool that allows generating of markdown documentation based on jsdoc comments.

## Install

```bash
npm i -D @innofake/jsdoc-markdown
```

## Usage

```bash
jsdoc-markdown
```

## Options

| Command/option   | Type     | Description                                                       | Example                                                 |
| ---------------- | -------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| --config         | string   | Path to custom config location                                    | `--config "../.jsdoc-markdown.config.json"`             |
| --dump           | boolean  | Output config instead of generating markdown                      | `--dump`                                                |
| --dumpStdOut     | boolean  | Output dumped config to stdout instead of config file specified with --config      | `--dumpStdOut`                         |
| --customElements | string   | Path to custom-elements.json                                      | `--customElements "../custom-elements.json"`            |
| --dir            | string   | Path to directory with js file(s) with jsdoc comments             | `--dir "../dist"`                                       |
| --srcDir         | string   | Path to directory with source files for custom elements generation       | `--srcDir "../src"`                              |
| --outFile        | string   | File name for generated markdown                                  | `--outFile "README.md"`                                 |
| --keepImports    | boolean  | Keep imports as relative paths in docs, by default imports are overwritten to be from importRoot | `--keepImports`          |
| --importRoot     | string   | Import root path to be used by docs instead of relative paths     | `--importRoot "@org/package-name"`                      |
| --excludePaths   | string   | Paths to ignore when generating from jsdoc. Comma delimited list  | `--excludePaths "stories,story,internal"`               |
| --excludeKinds   | string   | Custom element module kinds to ignore when generating from jsdoc. Comma delimited list | `--excludeKinds "custom-element-definition"`               |
| --analyzeFlags   | string   | Custom element analyzer additional flags. Comma delimited list    | `--analyzeFlags "litelement"`                           |


## Config

Instead of command line options, a json file can be used to configure the parameters. This can be specified using ```--config filename.json``` or by default will look for a ```.jsdoc-markdown.config.json``` file in the root. This can be generated with defaults using 

```bash
jsdoc-markdown --dump
```

The default config is as follows

```json
{
  "customElements": "custom-elements.json",
  "dir": "dist",
  "srcDir": "src",
  "outFile": "README.md",
  "keepImports": false,
  "excludePaths": [
    "stories",
    "story",
    "internal",
    "test"
  ],
  "excludeKinds": [
    "custom-element-definition"
  ],
  "analyzeFlags": [
    "--litelement"
  ]
}
```