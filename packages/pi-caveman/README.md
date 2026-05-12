# pi-caveman

Caveman mode for Pi-Shitty-aGeNt. Talk less, code same. ~75% fewer output tokens.

Place in `~/.pi/agent/extensions/pi-caveman/` for auto-discovery.

## What you get

### Commands

| Command             | What                                                      |
| ------------------- | --------------------------------------------------------- |
| `/caveman`          | Toggle caveman mode. Args: `lite`, `full`, `ultra`, `off` |
| `/caveman-commit`   | Redirects to `/skill:caveman-commit`                      |
| `/caveman-review`   | Redirects to `/skill:caveman-review`                      |
| `/caveman-compress` | Redirects to `/skill:compress`                            |

### Skills (auto-discovered)

| Skill            | Trigger                                            | What                                          |
| ---------------- | -------------------------------------------------- | --------------------------------------------- |
| `caveman`        | "caveman mode", "talk like caveman", "less tokens" | Core terse communication mode                 |
| `caveman-commit` | "commit message", "write a commit"                 | Terse Conventional Commits                    |
| `caveman-review` | "review PR", "code review"                         | One-line code review comments                 |
| `compress`       | "compress memory file"                             | Compress .md files (~46% input token savings) |

### Hooks (extension events)

| Event                | What                                                       |
| -------------------- | ---------------------------------------------------------- |
| `session_start`      | Auto-activates caveman from config, shows status in footer |
| `before_agent_start` | Injects caveman rules into system prompt when active       |
| `input`              | Detects natural language caveman on/off commands           |

### Status bar

Shows current mode in the footer: `caveman: full`, `caveman: lite`, `caveman: ultra`. Clears when caveman is off.

## Configuration

Default mode is `full`. Override in `~/.pi/agent/settings.json`:

```json
{
    "caveman": "ultra"
}
```

Options: `lite`, `full`, `ultra`, `off`. Set `"off"` to disable auto-activation. Modes persist until changed or session end.

## Intensity levels

| Level     | What                                                         |
| --------- | ------------------------------------------------------------ |
| **lite**  | Drop filler/hedging. Keep articles. Professional but tight   |
| **full**  | Drop articles, fragments OK, short synonyms. Classic caveman |
| **ultra** | Abbreviate prose, arrows for causality, max compression      |

## Compress skill

Compresses `.md` files into caveman format. Saves ~46% input tokens every session.

```bash
/skill:compress /path/to/AGENTS.md
```

The agent reads the file, compresses prose inline, and backs up the original as `.original.md`.

## License

MIT
