# Running OpenPencil

## 1. Build

From the repository root:

```sh
rm -rf dist packages/*/dist
bun install
bun run build
```

The first command removes stale application and package build output. `bun run build` then builds workspace packages, runs linting, and creates the Vite production build.

For only package artifacts:

```sh
rm -rf packages/*/dist
bun run build:packages
```

For a desktop Tauri build:

```sh
bun run tauri build
```

Requires Rust and Tauri platform prerequisites.

## 2. Run the web app

Preferred development server:

```sh
bun run dev:portless
```

Open `https://open-pencil.localhost`.

Portless provides a stable, named URL instead of a changing port. It also avoids port conflicts, keeps cookies and local storage isolated per app, and makes it easy to run multiple apps or worktrees side by side. HTTPS matches production-like browser behavior and supports secure-context features.

To use Portless without SSL:

```sh
PORTLESS_HTTPS=0 bun run dev:portless
```

This uses `http://open-pencil.localhost` (port 80). If port 80 requires elevated permissions or is already in use, choose another proxy port:

```sh
PORTLESS_HTTPS=0 PORTLESS_PORT=8080 bun run dev:portless
```

Then open `http://open-pencil.localhost:8080`.

Alternatively, use the fixed local server:

```sh
bun run dev
```

Open `http://localhost:1420`.

To serve an existing production build:

```sh
bun run preview
```

## 3. Install CLI utilities

Install the locally built packages globally. This builds the workspace, prepares publish-compatible manifests, packs the local artifacts, and installs those `.tgz` files; it does not install the registry versions from the workspace lockfile:

```sh
bun run install:global
```

Alternatively, install the published CLI globally:

```sh
npm install -g @open-pencil/cli
# or: bun add -g @open-pencil/cli
```

Verify:

```sh
openpencil --help
```

Examples:

```sh
openpencil info design.fig
openpencil tree design.fig
openpencil export design.fig
openpencil lint design.fig --preset strict
```

When developing from this repository:

```sh
bun run open-pencil -- --help
```

File-based commands do not require the desktop app. Commands without a file connect to the running app.

## 4. Serve MCP

### Install the MCP server

```sh
npm install -g @open-pencil/mcp
```

### Stdio MCP

Use this for Claude Code, Cursor, Windsurf, and similar MCP clients:

```sh
openpencil-mcp
```

For Claude Code:

```sh
claude mcp add --scope user open-pencil -- openpencil-mcp
```

The desktop app must be running with a document open.

### HTTP MCP

Use this for scripts, browser extensions, or HTTP clients:

```sh
openpencil-mcp-http
```

Default endpoint:

```text
http://127.0.0.1:7600/mcp
```

Health check:

```text
http://127.0.0.1:7600/health
```

Set the file-access root explicitly when needed:

```sh
OPENPENCIL_MCP_ROOT=/path/to/designs openpencil-mcp-http
```

### Run MCP from this checkout

Without global installation:

```sh
bun packages/mcp/src/stdio.ts
```

Or HTTP:

```sh
bun packages/mcp/src/index.ts
```

For local web development, allow the dev origin if needed:

```sh
OPENPENCIL_MCP_CORS_ORIGIN=https://open-pencil.localhost \
  openpencil-mcp-http
```

### MCP in the web app

There are two options:

1. **Standard MCP:** run `openpencil-mcp` or `openpencil-mcp-http` externally. The desktop app or local web app provides the running editor connection.
2. **Browser-native WebMCP:** experimental and built into the web app. Enable it under **Settings → MCP → WebMCP**. It requires a supported Chrome version and the WebMCP testing flag, and exposes a smaller browser-scoped tool set.

Browser-native WebMCP does not use the `openpencil-mcp` process.

## 5. Build and install a local `.tgz` package with Bun


 Usage:

 ```bash
   bun run build:packages
   bun run install:global
 ```


Build the workspace packages first, then pack the package you want to test. This example packs the CLI:

```sh
bun install
bun run build:packages
mkdir -p .tmp/packages
(cd packages/cli && bun pm pack --destination ../../.tmp/packages --quiet)
```

Install the generated tarball in another Bun project:

```sh
cd /path/to/consumer-project
bun add /path/to/open-pencil/.tmp/packages/open-pencil-cli-0.16.0-beta.1.tgz
```

To install a local CLI tarball globally instead:

```sh
bun add --global /path/to/open-pencil/.tmp/packages/open-pencil-cli-0.16.0-beta.1.tgz
```

Add Bun's global binary directory to `PATH` so `openpencil` is available:

```sh
BUN_BIN="$(bun pm bin --global)"
export PATH="$BUN_BIN:$PATH"
openpencil --help
```

Persist it for future zsh sessions:

```sh
echo 'export PATH="$(bun pm bin --global):$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Replace `packages/cli` with another package directory when packing a different workspace package. The tarball filename uses the package name, version, and `.tgz` suffix.



- FontManager.setSubstituteFamilies() now replaces the default Inter.
 - openpencil fonts --substitute "Arial,Roboto" now uses the supplied order instead of always preferring Inter.
 - The CLI option also works when querying the running web app through RPC.
 - Web app startup supports:

 ```bash
   VITE_OPENPENCIL_SUBSTITUTE_FONT="Arial,Roboto" bun run dev:portless
 ```
