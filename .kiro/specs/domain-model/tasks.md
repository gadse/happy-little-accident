# Implementation Plan: Domain Model

## Overview

Implement the pure TypeScript domain model layer for **happy-little-accident** inside `src/domain/`. This covers all value objects, entities, the `copyCard` operation, the `Result` type, and a barrel export. No external runtime dependencies are introduced; Vitest and fast-check are dev-only. All invariants are enforced at construction time; mutation is forbidden — every "update" returns a new instance.

## Tasks

- [x] 1. Project setup: install Vitest and fast-check, configure Vitest, add ESLint domain-purity rules
  - [x] 1.1 Install `vitest` and `fast-check` as dev dependencies
    - Run `npm install --save-dev vitest@latest fast-check@latest`
    - _Requirements: 11.1 (no runtime deps from npm packages)_
  - [x] 1.2 Create `vitest.config.ts` at the project root
    - Extend the existing Vite config; set `test.include` to `src/**/*.test.ts`; add `fc.configureGlobal({ numRuns: 100 })` in a global setup file `src/domain/__tests__/setup.ts`
    - Add `"test": "vitest --run"` script to `package.json`
    - _Requirements: 11.1_
  - [x] 1.3 Add ESLint `no-restricted-imports` rules for domain purity
    - Extend `eslint.config.js` with an override that applies only to `src/domain/**`: forbid imports from `react`, `react-dom`, and all non-type-only imports of any package listed in `dependencies`
    - _Requirements: 11.1, 11.2_

- [x] 2. Shared test generators (`src/domain/__tests__/generators.ts`)
  - [x] 2.1 Implement all fast-check arbitrary generators defined in the design
    - `arbRealm`, `arbCounter`, `arbEntityId`, `arbValidName`, `arbCardName`, `arbColumnName`, `arbBoardName`, `arbCardDescription`, `arbBoardDescription`, `arbCardCategory`, `arbDueDate`, `arbCard`, `arbColumn`, `arbBoard`, `arbWhitespaceOnly`, `arbOverlongName`
    - These generators are consumed by every property-based test; implement them before any test files
    - _Requirements: 1–10 (supports all property tests)_

- [x] 3. `Result` type (`src/domain/Result.ts`)
  - [x] 3.1 Implement the `Result<T>` discriminated union and helper functions
    - Declare `type Result<T> = { ok: true; value: T } | { ok: false; error: string }`
    - Implement `ok<T>(value: T): Result<T>` and `err(error: string): Result<never>`
    - No tests needed — this is a trivial type-level utility with no invariants
    - _Requirements: (referenced in Glossary; used by application layer)_

- [x] 4. `EntityId` value object (`src/domain/EntityId.ts`)
  - [x] 4.1 Implement `EntityId` class and `makeEntityId` factory
    - Constructor validates format `^(board|column|card)#[0-9a-f]{6}$`; throws with messages from the design error table
    - `makeEntityId(realm, counter)` encodes counter as zero-padded 6-digit lowercase hex; throws if counter > 0xFFFFFF
    - Expose `readonly realm`, `readonly hex`, `equals(other)`, `toString()`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 4.2 Write property tests for `EntityId` (Properties 1–4))
    - **Property 1: EntityId serialization round-trip** — `toString()` then re-construct → `equals()` true
    - **Property 2: EntityId counter encoding** — `makeEntityId(realm, counter).hex === counter.toString(16).padStart(6, '0')`
    - **Property 3: EntityId structural equality** — `a.equals(b)` iff `a.realm === b.realm && a.hex === b.hex`
    - **Property 4: Invalid strings rejected** — any string not matching the pattern throws
    - Also include unit tests: valid construction, error messages, realm/hex extraction
    - File: `src/domain/__tests__/EntityId.test.ts`
    - _Requirements: 1.1–1.6_

- [x] 5. Name value objects: `CardName`, `ColumnName`, `BoardName`
  - [x] 5.1 Implement `CardName` class (`src/domain/CardName.ts`)
    - Constructor throws if empty, whitespace-only (`trim() === ''`), or `[...value].length > 2048`
    - Expose `readonly value: string`, `equals(other: CardName): boolean`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 5.2 Implement `ColumnName` class (`src/domain/ColumnName.ts`)
    - Identical shape to `CardName` but a distinct type
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 5.3 Implement `BoardName` class (`src/domain/BoardName.ts`)
    - Identical shape to `CardName` and `ColumnName` but a distinct type
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 5.4 Write property tests for all three name value objects (Properties 5–7)
    - **Property 5: Name round-trip verbatim** — valid input → `.value` equals original string
    - **Property 6: Whitespace-only inputs rejected** — any whitespace-only (including empty) string throws
    - **Property 7: Equality is value-based** — `Name(a).equals(Name(b))` iff `a === b`
    - Also include unit tests: exact-boundary lengths (2048 cp valid, 2049 cp throws), error messages, multi-class coverage
    - Files: `src/domain/__tests__/CardName.test.ts`, `ColumnName.test.ts`, `BoardName.test.ts`
    - _Requirements: 2.1–2.5, 3.1–3.5, 4.1–4.5_

- [x] 6. Description value objects: `CardDescription`, `BoardDescription`
  - [x] 6.1 Implement `CardDescription` class (`src/domain/CardDescription.ts`)
    - Accepts any string ≤ 10,000 code points including empty; throws if over limit
    - Expose `readonly value: string`, `equals(other: CardDescription): boolean`
    - _Requirements: 5.1, 5.2, 5.8_
  - [x] 6.2 Implement `BoardDescription` class (`src/domain/BoardDescription.ts`)
    - Same constraints as `CardDescription`; additionally throws on `null` or `undefined`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 6.3 Write property tests for description value objects (Property 8)
    - **Property 8: Description round-trip verbatim** — valid string → `.value` equals original
    - Also include unit tests: empty string accepted, 10,000 cp accepted, 10,001 cp throws, `null`/`undefined` rejected by `BoardDescription`
    - Files: `src/domain/__tests__/CardDescription.test.ts`, `BoardDescription.test.ts`
    - _Requirements: 5.1, 5.2, 5.8, 6.1–6.4_

- [x] 7. `CardCategory` value object (`src/domain/CardCategory.ts`)
  - [x] 7.1 Implement `CardCategory` class
    - Throws if empty, whitespace-only, or `[...value].length > 100`; stores value verbatim
    - Expose `readonly value: string`, `equals(other: CardCategory): boolean`
    - _Requirements: 5.3, 5.4, 5.5, 5.8_
  - [x] 7.2 Write property tests for `CardCategory` (Property 9)
    - **Property 9: CardCategory round-trip and rejection** — valid inputs round-trip; empty/whitespace-only/overlength inputs throw
    - Also include unit tests: exact 100 cp boundary, whitespace-only rejection, error messages
    - File: `src/domain/__tests__/CardCategory.test.ts`
    - _Requirements: 5.3–5.5, 5.8_

- [x] 8. `DueDate` value object (`src/domain/DueDate.ts`)
  - [x] 8.1 Implement `DueDate` class
    - Constructor accepts only `{ year: number; month: number; day: number }` plain objects; throws if a `Date` instance is passed, if month is outside [1, 12], or if day is outside the valid range for the given month and year (Gregorian leap-year logic)
    - Expose `readonly year: number`, `readonly month: number`, `readonly day: number`, `equals(other: DueDate): boolean`
    - _Requirements: 5.6, 5.7, 5.8, 5.9_
  - [x] 8.2 Write property tests for `DueDate` (Properties 10–11)
    - **Property 10: DueDate round-trip** — valid `{ year, month, day }` → accessors return same integers
    - **Property 11: DueDate rejects invalid inputs** — out-of-range month/day and `Date` objects throw
    - Also include unit tests: Feb 29 on leap year accepted, Feb 29 on non-leap year throws, Dec 31 accepted, `Date` object rejected
    - File: `src/domain/__tests__/DueDate.test.ts`
    - _Requirements: 5.6–5.9_

- [x] 9. Checkpoint — ensure all value object tests pass
  - Run `npm test` and confirm all tests in steps 4–8 pass. Resolve any failures before continuing.

- [x] 10. `Card` entity (`src/domain/Card.ts`)
  - [x] 10.1 Implement `Card` class
    - Constructor accepts `CardFields`; throws if `id.realm !== 'card'`; sets `createdAt` and `lastModifiedAt` to the provided `createdAt`
    - Implement `withName`, `withDescription`, `withCategory`, `withDueDate` — each returns a new `Card` with `createdAt` from the original and `lastModifiedAt` set to the provided timestamp; do NOT expose `withCreatedAt`
    - All fields are `readonly`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 10.2 Write property tests for `Card` (Properties 12–13)
    - **Property 12: Card construction timestamp invariant** — `createdAt === t && lastModifiedAt === t` for any construction timestamp `t`
    - **Property 13: Card immutable update invariant** — any `with*` call returns a new object reference with `createdAt` unchanged and `lastModifiedAt === modifiedAt`
    - Also include unit tests: realm check on construction, `withDescription(undefined)` clears the field, each `with*` method preserves all other fields
    - File: `src/domain/__tests__/Card.test.ts`
    - _Requirements: 7.1–7.5_

- [x] 11. `Column` entity (`src/domain/Column.ts`)
  - [x] 11.1 Implement `Column` class
    - Constructor accepts `{ id, name, cards? }`; throws if `id.realm !== 'column'`; defaults `cards` to `[]`
    - Implement `withCardAt(index, card)` — throws if `index < 0 || index > cards.length`
    - Implement `withoutCard(cardId)` — throws if card not found
    - Implement `withCardsReordered(newOrder)` — throws if `newOrder` is not a permutation (same count, same IDs) of current cards
    - Implement `withName(name)`
    - All fields are `readonly`
    - _Requirements: 8.1–8.8_
  - [x] 11.2 Write property tests for `Column` (Properties 14–16)
    - **Property 14: Column card insertion invariant** — valid index inserts at correct position; out-of-range index throws
    - **Property 15: Column card removal invariant** — removes correct card, count decreases by 1, order preserved
    - **Property 16: Column card reorder is a permutation** — valid permutation succeeds; non-permutation throws
    - Also include unit tests: add to empty column, add at index 0 and end, remove only card, reorder 2 cards, error messages
    - File: `src/domain/__tests__/Column.test.ts`
    - _Requirements: 8.1–8.8_

- [x] 12. `Board` entity (`src/domain/Board.ts`)
  - [x] 12.1 Implement `Board` class
    - Constructor accepts `{ id, name, createdAt, description?, columns? }`; throws if `id.realm !== 'board'`; sets `createdAt` and `lastModifiedAt` to `createdAt`; `createdAt` is never modifiable
    - Implement `withColumnAt(index, column, modifiedAt)` — throws if out of range
    - Implement `withoutColumn(columnId, modifiedAt)` — throws if not found
    - Implement `withUpdatedColumn(column, modifiedAt)` — replaces by id, updates `lastModifiedAt`
    - Implement `withName(name, modifiedAt)` and `withDescription(description, modifiedAt)`
    - All fields are `readonly`; `createdAt` is never changed by any method
    - _Requirements: 9.1–9.10_
  - [x] 12.2 Write property tests for `Board` (Properties 13, 17–19)
    - **Property 13 (Board): Board immutable update invariant** — `createdAt` unchanged, `lastModifiedAt === ts` after any update
    - **Property 17: Board column insertion invariant** — valid index inserts at correct position; out-of-range throws
    - **Property 18: Board column removal invariant** — removes correct column, count decreases by 1
    - **Property 19: `lastModifiedAt` updated on all structural changes** — every update method sets `lastModifiedAt === ts`
    - Also include unit tests: `createdAt` immutability, realm check, `withUpdatedColumn` with unknown id throws, `withDescription(undefined)` clears the field
    - File: `src/domain/__tests__/Board.test.ts`
    - _Requirements: 9.1–9.10_

- [x] 13. `copyCard` domain operation (`src/domain/copyCard.ts`)
  - [x] 13.1 Implement `copyCard` function
    - Throws if `newId.realm !== 'card'`
    - Returns new `Card` with `id = newId`, `createdAt = pasteAt`, `lastModifiedAt = pasteAt`, and `name`, `description`, `category`, `dueDate` copied from `source` (absent fields remain absent)
    - _Requirements: 10.1–10.6_
  - [x] 13.2 Write property tests for `copyCard` (Property 20)
    - **Property 20: `copyCard` produces a correct copy** — `id.equals(newId)`, timestamps equal `pasteAt`, all data fields equal source, absent fields absent on copy
    - Also include unit tests: wrong-realm `newId` throws, copy is a distinct object from source, optional fields are correctly omitted when absent on source
    - File: `src/domain/__tests__/copyCard.test.ts`
    - _Requirements: 10.1–10.6_

- [x] 14. Barrel export (`src/domain/index.ts`)
  - [x] 14.1 Create `index.ts` re-exporting all public domain types and functions
    - Export: `EntityId`, `makeEntityId`, `CardName`, `ColumnName`, `BoardName`, `CardDescription`, `BoardDescription`, `CardCategory`, `DueDate`, `Card`, `Column`, `Board`, `copyCard`, `Result`, `ok`, `err`
    - Verify the module compiles cleanly with `tsc --noEmit` after all previous tasks are complete
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 15. Final checkpoint — full test suite and domain purity check
  - Run `npm test` to confirm all tests pass (unit and property-based).
  - Run `npm run lint` to verify no ESLint violations, including domain-purity rules.
  - Run `npx tsc --noEmit` to confirm zero TypeScript errors.
  - Ensure all tests pass and ask the user if questions arise.

## Second Pass: Timestamp value object

This pass introduces a `Timestamp` value object and replaces the plain `Date` timestamps on `Card` and `Board`, closing the shared-mutable-`Date` hole (a `Date` shared by reference between a card and its copy could be mutated through either holder). Added after tasks 1–15 were completed.

- [x] 16. `Timestamp` value object (`src/domain/Timestamp.ts`) and timestamp refactor
  - [x] 16.1 Implement `Timestamp` class
    - `Timestamp.of(input: Date | number)` constructs from a `Date` (read `.getTime()`, do not retain the reference) or epoch milliseconds; store the instant as a private `number`
    - Throw if the input is an invalid `Date` (`NaN` time) or a non-finite number
    - Expose `get epochMillis(): number`, `toDate(): Date` (returns a fresh `Date` on every call), and `equals(other: Timestamp): boolean`
    - _Requirements: 12.1, 12.2, 12.3_
  - [x] 16.2 Write property and unit tests for `Timestamp` (Property 21)
    - **Property 21: Timestamp is immutable and does not alias its source** — mutating the source `Date` after construction, or the `Date` returned by `toDate()`, does not change `epochMillis`; `a.equals(b)` iff `a.epochMillis === b.epochMillis`; invalid `Date`/non-finite number throws
    - Unit tests: construct from `Date` and from millis, round-trip `epochMillis`, `toDate()` returns distinct instances, `NaN`/`Infinity` rejected with the error message from the design table
    - File: `src/domain/__tests__/Timestamp.test.ts`
    - _Requirements: 12.1, 12.2, 12.3_
  - [x] 16.3 Refactor `Card`, `Board`, and `copyCard` to use `Timestamp`
    - Change `createdAt`/`lastModifiedAt` on `Card` and `Board` from `Date` to `Timestamp`; update `CardCreateFields`/`CardRestoreFields`, the `with*` `modifiedAt` parameters, and `copyCard`'s `pasteAt` parameter to `Timestamp`
    - Update existing `Card`/`Board`/`copyCard` tests and the shared generators (`arbCard`, `arbColumn`, `arbBoard`, and the inline `Card.create` calls) to build timestamps via `arbTimestamp` / `Timestamp.of(...)` instead of passing raw `fc.date()` / `Date`
    - Add `arbTimestamp` to `generators.ts`
    - _Requirements: 12.4, 7.1, 7.3, 7.4, 9.1, 9.3, 10.3_
  - [x] 16.4 Export `Timestamp` from the barrel (`src/domain/index.ts`)
    - Add `Timestamp` to the re-exports
    - _Requirements: 11.3_

- [x] 17. Second-pass checkpoint — full suite and purity check
  - Run `npm test` to confirm all tests pass (including the new Property 21 and the updated `Card`/`Board`/`copyCard` tests).
  - Run `npm run lint` to verify no ESLint violations, including domain-purity rules.
  - Run `npx tsc --noEmit` to confirm zero TypeScript errors after the timestamp refactor.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements and correctness properties for traceability
- Checkpoints (tasks 9, 15, and 17) are gates — resolve failures before moving to the next phase
- Property tests use `fast-check` with `numRuns: 100`; generators in `generators.ts` are shared across all test files
- The domain layer must never import from React, browser APIs, or any runtime npm package (Requirement 11); ESLint enforces this statically

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["4.1", "5.1", "5.2", "5.3", "6.1", "6.2", "7.1", "8.1"] },
    { "id": 3, "tasks": ["4.2", "5.4", "6.3", "7.2", "8.2"] },
    { "id": 4, "tasks": ["10.1", "11.1"] },
    { "id": 5, "tasks": ["10.2", "11.2", "12.1"] },
    { "id": 6, "tasks": ["12.2", "13.1"] },
    { "id": 7, "tasks": ["13.2", "14.1"] },
    { "id": 8, "tasks": ["16.1"] },
    { "id": 9, "tasks": ["16.2", "16.3"] },
    { "id": 10, "tasks": ["16.4", "17"] }
  ]
}
```
