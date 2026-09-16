---
inclusion: always
---

<!------------------------------------------------------------------------------------
   Tech stack, architecture, coding conventions.
------------------------------------------------------------------------------------->

# Project: happy-little-accident

A local-first Trello alternative built on boring, maintainable software principles.


## Documentation

- Prepend 1st-Level headers (H1, `#`) in all Markdown-Documents with 3 empty lines.
- Prepend 2nd-Level headers (H2, `##`) in all Markdown-Documents with 2 empty lines.
- Prepend all other headers in all Markdown-Documents with the usual one empty line.
- Always keep one empty line between a header and its content.


## Stack

- **Language:** TypeScript
- **UI:** React
- **Package manager:** npm
- **Linter:** ESLint
- **Formatter:** Prettier
- **No backend.** All data lives locally in the browser.


## Code Conventions

Follow community-standard idioms for TypeScript and React. When in doubt, prefer the obvious, readable solution over a clever one.

### React

Adhere to [The Rules of React](https://react.dev/reference/rules):

- Components must be pure with respect to rendering — no side effects during render.
- Never mutate props or state directly; always return new values.
- Hooks must only be called at the top level of components or other hooks.
- Keep effects minimal and explicit about their dependencies.

### TypeScript

- Use types and interfaces wherever they add clarity or safety — which is most of the time.
- Prefer explicit return types on functions, especially in the domain layer.
- Avoid `any`. Use `unknown` with narrowing when the type is genuinely unknown.

### Avoid Primitive Obsession

In the core business logic, wrap primitives in domain classes rather than passing raw strings, numbers, or booleans around. Domain classes encapsulate validation, behavior, and equality in one place.

Use this pattern for all value objects:

```ts
class Username {
  // Native private field (#) — truly private at runtime, not just a compile-time check.
  // This also makes the type structurally unique: a plain string cannot satisfy Username.
  readonly #value: string;

  // Private constructor — all construction goes through the static factory.
  // Validation is never bypassed.
  private constructor(value: string) {
    if (value.trim().length === 0) throw new Error("Username cannot be empty");
    if (value.length > 50) throw new Error("Username too long");
    this.#value = value.trim().toLowerCase();
  }

  // Static factory method — the only way to create an instance.
  static of(value: string): Username {
    return new Username(value);
  }

  get value(): string {
    return this.#value;
  }

  equals(other: Username): boolean {
    return this.#value === other.#value;
  }

  toString(): string {
    return this.#value;
  }
}
```

Key rules:

- Always use `#` (native private) — never the TypeScript `private` keyword, which is compile-time only and bypassable with `as any`.
- Always use a private constructor with a static factory (`static of()` or `static create()`).
- Prefer **immutable updates**: methods that change state return a new instance rather than mutating. This is safe for React state and predictable in tests.
- Use value objects for any concept that has identity, rules, or behavior — card titles, board names, column names, IDs, etc.


## Architecture: Onion / Layered

Keep business logic independent of React and the DOM. Structure the code in layers:

```
src/
  domain/       # Pure business logic, types, value objects — no React, no browser APIs
  application/  # Use cases and state orchestration — coordinates domain objects
  infrastructure/ # Local storage adapters, persistence — implements domain interfaces
  ui/           # React components and hooks — thin layer, delegates to application
```

**Rules:**
- `domain/` has zero external dependencies. No imports from React, browser APIs, or npm packages.
- `application/` may import from `domain/` only.
- `infrastructure/` implements interfaces defined in `domain/` and may use browser APIs.
- `ui/` imports from `application/` and `domain/` types only — never directly from `infrastructure/`.
- Data flows inward: `ui → application → domain`. Dependencies point inward only.


## Tooling Expectations

- Run `npm run lint` to check for ESLint issues.
- Run `npm run format` (or `prettier --write`) to format code.
- Do not bypass ESLint rules with `// eslint-disable` comments unless there is a documented reason.


## Keeping State

State is to be kept in one or several JSON files. Not in a database or similar structures that prevent easy portability.