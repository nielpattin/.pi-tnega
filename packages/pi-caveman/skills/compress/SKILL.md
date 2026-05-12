---
name: compress
description: >
  Compress natural language memory files (AGENTS.md, todos, preferences) into caveman format
  to save input tokens. Preserves all technical substance, code, URLs, and structure.
  Compressed version overwrites the original file. Human-readable backup saved as FILE.original.md.
  Trigger: /caveman:compress FILEPATH or "compress memory file"
---

# Caveman Compress

## Trigger

`/caveman:compress <filepath>` or when user asks to compress a memory file.

## Process

1. Read the target file.
2. Back up original as `<filename>.original.md`. If backup already exists, abort and tell user.
3. Compress the prose using the rules below.
4. Write compressed version over the original file.
5. Report: original size vs compressed size, percent saved.

## Compression Rules

### Remove
- Articles: a, an, the
- Filler: just, really, basically, actually, simply, essentially, generally
- Pleasantries: "sure", "certainly", "of course", "happy to", "I'd recommend"
- Hedging: "it might be worth", "you could consider", "it would be good to"
- Redundant phrasing: "in order to" → "to", "make sure to" → "ensure"
- Connective fluff: "however", "furthermore", "additionally"

### Preserve EXACTLY (never modify)
- Code blocks (fenced ``` and indented)
- Inline code (`backtick content`)
- URLs and links (full URLs, markdown links)
- File paths, commands, technical terms, proper nouns
- Dates, version numbers, numeric values, environment variables

### Preserve Structure
- All markdown headings (keep exact heading text, compress body below)
- Bullet point hierarchy (keep nesting level)
- Numbered lists (keep numbering)
- Tables (compress cell text, keep structure)

### Compress
- Use short synonyms: "big" not "extensive", "fix" not "implement a solution for"
- Fragments OK: "Run tests before commit" not "You should always run tests before committing"
- Drop "you should", "make sure to", "remember to" — just state the action
- Merge redundant bullets that say the same thing differently
- Keep one example where multiple examples show the same pattern

CRITICAL RULE: Anything inside ``` ... ``` must be copied EXACTLY. Inline code (`...`) must be preserved EXACTLY.

## File Type Detection

Only compress natural language files: `.md`, `.txt`, `.markdown`, `.rst`, `.typ`, `.typst`, `.tex`, or extensionless.

Never modify: `.py`, `.js`, `.ts`, `.json`, `.yaml`, `.yml`, `.toml`, `.env`, `.lock`, `.css`, `.html`, `.xml`, `.sql`, `.sh`.

If file has mixed content (prose + code), compress ONLY the prose sections.

## Boundaries

- NEVER compress `.original.md` backup files
- Original file must be backed up before overwriting
- If the file is already terse, say so and skip
