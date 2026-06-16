# OpenCode - AnitaCode Fork

## Project Overview
OpenCode is an open-source AI coding agent that uses LLMs to assist with software development tasks in terminal, web browser, or desktop app. The AnitaCode fork adds macOS-native features and customization.

## Tech Stack
- **Runtime**: Bun (v1.3.14)
- **Language**: TypeScript (with tsgo native preview)
- **Monorepo**: Bun workspaces + Turborepo
- **Core Framework**: Effect (v4.0.0-beta.74)
- **Database**: Drizzle ORM (v1.0.0-rc.2) with SQLite
- **Web UI**: SolidJS + Vite + TailwindCSS 4
- **TUI**: OpenTUI (terminal UI framework)
- **Desktop**: Electron
- **Web Server**: Hono
- **LLM Integration**: Vercel AI SDK + custom @opencode-ai/llm
- **Infrastructure**: SST (Cloudflare + AWS)

## Main Packages
- `opencode` - Main application (CLI, server, session management)
- `@opencode-ai/core` - Shared core library (DB schemas, config, FS)
- `@opencode-ai/llm` - Schema-first LLM core
- `@opencode-ai/app` - Shared web UI (SolidJS)
- `@opencode-ai/tui` - Terminal UI
- `@opencode-ai/desktop` - Electron desktop app
- `@opencode-ai/ui` - Shared UI components
- `@opencode-ai/sdk` - JavaScript SDK (auto-generated)
- `@opencode-ai/plugin` - Plugin SDK

## Project Status
- **Version**: 1.17.7
- **Downloads**: 10M+ total, 50K-100K+ daily
- **Maturity**: Production-quality, rapidly growing
- **AnitaCode Fork**: Early stage (Phase 1: Setup and Rebranding)

## Key Conventions
- Effect-first architecture (typed functional programming)
- Flat top-level exports with self-reexport pattern
- Avoid `export namespace Foo { ... }` - use flat exports
- Avoid unnecessary destructuring - use dot notation
- Prefer `const` over `let`
- Avoid `else` statements - use early returns
- Use Bun APIs when possible
- Tests cannot run from repo root - run from package dirs

## Git Conventions
- Branch names: max 3 words, hyphens (e.g., `session-recovery`)
- Commits: conventional commit style (`feat(scope): summary`)
- Valid types: feat, fix, docs, chore, refactor, test
