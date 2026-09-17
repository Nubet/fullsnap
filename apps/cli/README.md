# Fullsnap

Capture stable, full-page screenshots of a website across multiple device viewports from one command.

Fullsnap is a CLI for checking responsive layouts during development and before release. It uses Playwright, waits for fonts and page layout to stabilize, disables animations when configured, and writes screenshots plus a JSON report to disk.

## Requirements

- Node.js 20 or newer
- A URL or a local development server

## Installation

Install the CLI globally:

```bash
npm install -g @norbert-fila/fullsnap
```

Or run it without a global install:

```bash
npx @norbert-fila/fullsnap https://example.com
```

Playwright is installed as a package dependency. Browser binaries are downloaded by Playwright when needed.

## Quick start

Capture the default devices:

```bash
fullsnap https://example.com
```

For a local app:

```bash
fullsnap http://localhost:3000
```

Screenshots and `report.json` are saved under `./screenshots/<hostname>/<timestamp>/`.

## Initialize a project

Run the interactive wizard from your project directory:

```bash
fullsnap init
```

This creates `fullsnap.config.js` with your selected devices, output directory, and concurrency.

## Options

```text
-a, --all                       Capture all built-in devices
-d, --devices <list>            Comma-separated device IDs
-c, --custom-device <spec>      Custom viewport: name=widthxheight
-h, --help                      Show help
-V, --version                   Show the installed version
```

Examples:

```bash
fullsnap https://example.com --all
fullsnap https://example.com --devices "iphone-15-pro,desktop-1920"
fullsnap https://example.com --custom-device "tablet=768x1024"
fullsnap https://example.com --custom-device "tablet=768x1024" --custom-device "wide=3440x1440"
```

Custom device names may contain letters, numbers, `_`, and `-`. Width and height must be positive integers.

## Configuration

Create `fullsnap.config.js` manually or use `fullsnap init`:

```javascript
export default {
  devices: [
    'desktop-1920',
    'macbook-pro-14',
    'iphone-15-pro',
    'galaxy-s24'
  ],
  capture: {
    format: 'png',
    animations: 'disable',
    concurrency: 2
  },
  output: './screenshots'
};
```

Supported animation modes are `wait`, `disable`, and `allow`. The default output format is `png`.

Built-in device IDs:

```text
iphone-se, iphone-14, iphone-15-pro, iphone-14-pro-max, iphone-16-pro-max
pixel-9, galaxy-s24, pixel-7a, android-small
laptop-1366, macbook-pro-14, desktop-1920, desktop-2560
```

## Output

Each capture directory contains one image per device and a `report.json` file with capture status, viewport dimensions, timing metrics, and warnings.

## Links

- Repository: https://github.com/Nubet/fullsnap
- Issues: https://github.com/Nubet/fullsnap/issues
- npm: https://www.npmjs.com/package/@norbert-fila/fullsnap

## License

MIT
