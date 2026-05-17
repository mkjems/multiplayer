Please read PROJECT_CONTEXT.md to understand what this project is about

Feel free to make additional files in memory folder

# Developer Experience Requirements

## Strong IDE Refactoring

This project must preserve strong IDE-assisted refactoring and code navigation.

The codebase should support:

- Find All References
- Go To Definition
- Rename Symbol
- Type-aware autocomplete
- Hover type information
- Dead code/import detection

These capabilities must work reliably across both server and client code.

### Technical Requirements

- All source code must be written in TypeScript.
- Avoid patterns that degrade static analysis.
- Prefer explicit imports/exports over dynamic loading.
- Avoid excessive runtime string-based APIs for wiring components.
- Public APIs between modules should be strongly typed.
- Minimize use of `any`.
- Avoid patterns that obscure symbol relationships from the TypeScript language service.

### Architectural Intent

The project should remain highly navigable for both humans and AI agents.

A developer or agent should be able to:

1. Select a symbol in VS Code
2. Find all usages
3. Rename safely across the project
4. Understand call chains through static analysis

The architecture should favor explicitness and static discoverability over cleverness or dynamic indirection.

### Examples of Preferred Patterns

Preferred:

```ts
import { Player } from "./Player.ts";

player.move();