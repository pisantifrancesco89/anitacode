# Architecture Decisions

## Effect-First Architecture
OpenCode uses Effect (v4.0.0-beta.74) as its core framework. This is a typed functional programming library for TypeScript that provides:
- Typed errors
- Service-oriented architecture
- Stream processing
- Dependency injection

**Rationale**: Effect provides strong type safety and composability for complex systems.

## Module Organization
- Flat top-level exports with self-reexport pattern
- Avoid `export namespace Foo { ... }`
- Use `export * as Foo from "./foo"` for namespace projection

**Rationale**: Standard ESM compatibility, tree-shaking support, Node.js native TypeScript runner compatibility.

## Database Schema
- Drizzle ORM with SQLite
- Snake_case for field names
- Schema files in `packages/core/src/**/*.sql.ts`

**Rationale**: SQLite for simplicity and portability, snake_case for SQL compatibility.

## Multi-Protocol LLM Support
- Protocol-first architecture in `@opencode-ai/llm`
- Adding new providers is typically 5-15 lines of route configuration

**Rationale**: Easy extensibility for new LLM providers.

## Auto-Update Architecture
- `autoDownload = false` / `autoInstallOnAppQuit = false` on electron-updater (controller manages state)
- Controller checks → downloads → stores ready state in persistent store
- Native notification shown when update is ready (click to install)
- `before-quit` event handler auto-installs if update is ready (no manual restart needed)
- `electron-builder` publishes to GitHub Releases → `electron-updater` checks releases

**Rationale**: Keep state management in controller (not relying on electron-updater internals), provide both notification and auto-install on quit for the best UX.

## Release Strategy (Custom Channel)
- `OPENCODE_CHANNEL=custom` builds AnitaCode-branded installer
- Script `release-custom.ts` bumps version, builds, commits, tags, publishes
- GitHub Actions workflow `release-anitacode.yml` auto-builds on push to `main`
- Artifacts uploaded to GitHub Releases → auto-update picks them up
