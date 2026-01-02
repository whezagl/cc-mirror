# cc-mirror

[![npm version](https://img.shields.io/npm/v/cc-mirror.svg)](https://www.npmjs.com/package/cc-mirror)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Twitter Follow](https://img.shields.io/twitter/follow/nummanali?style=social)](https://twitter.com/nummanali)

**Create multiple isolated Claude Code variants with custom providers.**

Run Claude Code with Z.ai, MiniMax, OpenRouter, Claude Code Router, or any Anthropic-compatible API — each with its own config, themes, and session storage.

## Features

- **Multiple Providers** — Z.ai, MiniMax, OpenRouter, Claude Code Router, or custom
- **Complete Isolation** — Each variant has its own config, sessions, and themes
- **Brand Themes** — Custom color schemes per provider (via tweakcc)
- **Prompt Packs** — Enhanced system prompts for Z.ai/MiniMax
- **One-Command Updates** — Update all variants when Claude Code releases
- **Interactive TUI** — Full-screen setup wizard or CLI for automation

## Installation

```bash
# Run directly with npx
npx cc-mirror

# Or install globally
npm install -g cc-mirror
cc-mirror
```

## Quick Start

### Interactive TUI

```bash
npx cc-mirror --tui
```

### CLI Quick Setup

```bash
# Z.ai
npx cc-mirror quick --provider zai --api-key "$ZAI_API_KEY"

# MiniMax
npx cc-mirror quick --provider minimax --api-key "$MINIMAX_API_KEY"

# OpenRouter (requires model mapping)
npx cc-mirror quick --provider openrouter --api-key "$OPENROUTER_API_KEY" \
  --model-sonnet "anthropic/claude-3.5-sonnet" \
  --model-opus "anthropic/claude-3-opus" \
  --model-haiku "anthropic/claude-3-haiku"

# Claude Code Router (route to any model)
npx cc-mirror quick --provider ccrouter \
  --model-sonnet "deepseek,deepseek-chat" \
  --model-opus "deepseek,deepseek-reasoner" \
  --model-haiku "ollama,qwen2.5-coder:latest"
```

## Variant Structure

Each variant is fully isolated in `~/.cc-mirror/<name>/`:

```
~/.cc-mirror/<variant>/
├── npm/              # Claude Code installation
├── config/           # CLAUDE_CONFIG_DIR
│   ├── settings.json # API keys, env overrides
│   └── .claude.json  # MCP servers, approvals
├── tweakcc/          # Theme & prompt configs
│   ├── config.json   # Brand preset
│   └── system-prompts/
└── variant.json      # Metadata

Wrapper: ~/.local/bin/<variant>
```

## Commands

```bash
# Create/manage variants
cc-mirror create [options]    # Full control
cc-mirror quick [options]     # Fast setup
cc-mirror list                # List all variants
cc-mirror update [name]       # Update one or all
cc-mirror remove <name>       # Delete variant
cc-mirror doctor              # Health check
cc-mirror tweak <name>        # Launch tweakcc UI

# Run your variant
zai                           # If you named it 'zai'
minimax                       # If you named it 'minimax'
```

## Options

```
--provider <name>        zai | minimax | openrouter | ccrouter | custom
--api-key <key>          Provider API key
--base-url <url>         Custom API endpoint
--model-sonnet <name>    Map to sonnet model
--model-opus <name>      Map to opus model
--model-haiku <name>     Map to haiku model
--brand <preset>         Theme: auto | none | zai | minimax | openrouter | ccrouter
--root <path>            Variants root (default: ~/.cc-mirror)
--bin-dir <path>         Wrapper dir (default: ~/.local/bin)
--no-tweak               Skip tweakcc
--no-prompt-pack         Skip prompt enhancements
--no-skill-install       Skip dev-browser skill
```

## Provider Details

| Provider | Auth | Model Mapping | Notes |
|----------|------|---------------|-------|
| Z.ai | API Key | Auto | Enhanced prompts, shell env support |
| MiniMax | API Key | Auto | Enhanced prompts, MCP server pre-configured |
| OpenRouter | Auth Token | Required | Works with any model on OpenRouter |
| CCRouter | Optional | Required | Route to any provider via Claude Code Router |

## Updating Variants

When Claude Code releases a new version:

```bash
# Update all variants
cc-mirror update

# Update specific variant
cc-mirror update zai
```

## Brand Themes

Each provider has an optional color theme:

- **zai** — Dark carbon with gold accents
- **minimax** — Coral/red/orange spectrum
- **openrouter** — Teal/cyan (matching ASCII splash)
- **ccrouter** — Sky blue accents

Themes are applied via [tweakcc](https://github.com/tweak-cc/tweakcc).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT — see [LICENSE](LICENSE)

## Author

**Numman Ali**
- Twitter: [@nummanali](https://twitter.com/nummanali)
- GitHub: [@numman-ali](https://github.com/numman-ali)
