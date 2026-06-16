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
