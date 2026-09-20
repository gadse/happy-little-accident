# Design Document: Domain Model

## Table of Contents

- [Overview](#overview)
  - [Design Goals](#design-goals)
- [Architecture](#architecture)
  - [Dependency graph](#dependency-graph)
  - [Data flow](#data-flow-outward)
- [Components and Interfaces](#components-and-interfaces)
  - [Value Objects](#value-objects)
  - [Entities](#entities)
  - [Domain Operation: copyCard](#domain-operation-copycard)
  - [Result Type](#result-type)
- [Data Models](#data-models)
  - [Entity ID encoding](#entity-id-encoding)
  - [Card (in-memory)](#card-in-memory)
  - [Column (in-memory)](#column-in-memory)
  - [Board (in-memory)](#board-in-memory)
  - [Domain invariants summary](#domain-invariants-summary)
- [Correctness Properties](#correctness-properties)
- [Error Handling](#error-handling)
- [Testing Strategy](#testing-strategy)

## Overview

The domain model is the innermost layer of **happy-little-accident**. It is a pure TypeScript module that lives entirely inside `src/domain/` and has zero external dependencies — no React, no browser APIs, no npm packages at runtime. Every invariant the application depends on is enforced here at construction time. If an object can be constructed, it is valid.

The model exposes three entity types (`Board`, `Column`, `Card`) and their supporting value objects (`EntityId`, `BoardName`, `ColumnName`, `CardName`, `BoardDescription`, `CardDescription`, `CardCategory`, `DueDate`, `Timestamp`). It also exposes a single domain operation, `copyCard`. Everything else in the application (application layer, infrastructure adapters, UI) builds on these types.

All mutations produce new object instances. No domain object is mutated after construction. This keeps change detection predictable for React and keeps the domain layer free of shared-state surprises.

### Design Goals

- **No invalid state.** Value objects throw at construction if their invariants are violated. The application layer catches those throws and converts them to `Result` values.
- **No external dependencies.** The domain can be tested in isolation with any JS test runner without a DOM, React, or file system.
- **Immutable by design.** Every "update" operation is a function that returns a new instance. The original is unchanged.
- **Deterministic IDs.** IDs are derived from a per-realm monotonic counter, which is predictable in tests and requires no randomness.


## Architecture

The domain layer is a collection of pure TypeScript modules with no side effects at module load time. It exports types and functions; it does not instantiate any singletons or register any global state.

```
src/domain/
  EntityId.ts          — EntityId value object and factory
  CardName.ts          — CardName value object
  ColumnName.ts        — ColumnName value object
  BoardName.ts         — BoardName value object
  CardDescription.ts   — CardDescription value object
  BoardDescription.ts  — BoardDescription value object
  CardCategory.ts      — CardCategory value object
  DueDate.ts           — DueDate value object
  Timestamp.ts         — Timestamp value object
  Card.ts              — Card entity
  Column.ts            — Column entity
  Board.ts             — Board entity
  copyCard.ts          — copyCard domain operation
  index.ts             — barrel export
```

All files in this directory export only types and pure functions. No file has top-level executable statements other than `const`, `type`, `interface`, `class`, and `function` declarations initialized with literal values or other pure expressions.

### Dependency graph

```
Board  ──depends on──▶  Column  ──depends on──▶  Card
  |                        |                       │
  |                        |                       │    
  `------------------------+-----------------------'   
                           |
                           v                   
                        value objects
                    (EntityId, CardName, …)
```

Value objects have no dependencies other than each other and the built-in TypeScript types. Entities depend only on value objects and other entities in the direction shown above. `copyCard` depends on `Card` and `EntityId`.

### Data flow (outward)

```
domain  ◀── application  ◀── infrastructure  ◀── ui
```

The domain does not know about any other layer. It exposes a typed public API and that is all.


## Components and Interfaces

### Value Objects

All value objects follow the same shape:

- A constructor/factory that throws `Error` if invariants are violated.
- An immutable `value` property (or explicit field accessors for `DueDate`).
- An `equals(other)` method that compares by value.

#### `EntityId`

```typescript
class EntityId {
  readonly realm: 'board' | 'column' | 'card';
  readonly hex: string; // exactly 6 lowercase hex digits

  constructor(raw: string); // throws if format is invalid
  equals(other: EntityId): boolean;
  toString(): string; // returns "<realm>#<hex>"
}

/** Creates an EntityId from a realm and a monotonic counter value. */
function makeEntityId(realm: 'board' | 'column' | 'card', counter: number): EntityId;
```

The `counter` passed to `makeEntityId` is a non-negative integer. The factory encodes it as a zero-padded 6-digit lowercase hex string. Counters above `0xFFFFFF` (16,777,215) would overflow the 6-digit field; the factory throws in that case (practical limit is never reached in a local single-user app).

Per-realm counters are owned by the application layer (not the domain). The domain only validates and stores IDs — it does not maintain any counter state.

#### Name value objects (`CardName`, `ColumnName`, `BoardName`)

All three are structurally identical:

```typescript
class CardName {
  readonly value: string;
  constructor(value: string); // throws if empty, whitespace-only, or > 2048 code points
  equals(other: CardName): boolean;
}
// ColumnName and BoardName follow the same shape
```

"Whitespace-only" is defined using `String.prototype.trim()` against the Unicode whitespace set (ES2023 semantics). "Length" is measured in Unicode code points via `[...value].length`.

#### Description value objects (`CardDescription`, `BoardDescription`)

```typescript
class CardDescription {
  readonly value: string;
  constructor(value: string); // throws if > 10,000 code points; empty string is valid
  equals(other: CardDescription): boolean;
}
// BoardDescription follows the same shape; also throws on null/undefined
```

`BoardDescription` additionally rejects `null` and `undefined` at the TypeScript level via overloaded signatures, and throws at runtime if either is passed.

#### `CardCategory`

```typescript
class CardCategory {
  readonly value: string;
  constructor(value: string); // throws if empty, whitespace-only, or > 100 code points
  equals(other: CardCategory): boolean;
}
```

#### `DueDate`

```typescript
class DueDate {
  readonly year: number;
  readonly month: number; // 1–12
  readonly day: number;   // 1–31, validated against the actual calendar

  /** Accepts only a plain `{ year, month, day }` object. Throws for datetimes,
   *  out-of-range values, or non-date primitives. */
  constructor(input: { year: number; month: number; day: number });
  equals(other: DueDate): boolean;
}
```

`DueDate` rejects anything that carries a time component — if a `Date` object is passed, the constructor throws because `Date` always has a time component. The factory only accepts a plain object with `year`, `month`, and `day` integer fields.

Calendar validation uses a lookup table for month lengths (accounting for leap years via the proleptic Gregorian calendar rule: divisible by 4, except centuries unless also divisible by 400).

#### `Timestamp`

```typescript
class Timestamp {
  /** Constructs from a Date (copied defensively) or epoch milliseconds.
   *  Throws for an invalid Date (NaN time) or a non-finite number. */
  static of(input: Date | number): Timestamp;

  get epochMillis(): number;
  toDate(): Date;      // returns a fresh Date, never the internal instance
  equals(other: Timestamp): boolean;
}
```

`Timestamp` stores the instant as a private `number` (epoch milliseconds), so there is no mutable `Date` to leak. Constructing from a `Date` reads `.getTime()` and discards the reference; the caller's `Date` is never retained. `toDate()` builds a new `Date` on each call, so a holder cannot mutate a `Timestamp`'s instant through a returned `Date`.

This closes the one remaining shared-mutable-state hole in the entities: `createdAt`/`lastModifiedAt` were previously plain `Date` objects, which are mutable and shared by reference between a card and its copy (or between an entity and its `with*`-derived successor). A `Timestamp` makes that sharing safe by construction rather than by convention.

### Entities

Entities are immutable records. "Update" methods return a new instance with the changed field; the original is unchanged. TypeScript `readonly` modifiers on all fields enforce this at compile time.

#### `Card`

```typescript
interface CardFields {
  id: EntityId;            // realm must be 'card'
  name: CardName;
  createdAt: Timestamp;
  lastModifiedAt: Timestamp;
  description?: CardDescription;
  category?: CardCategory;
  dueDate?: DueDate;
}

class Card {
  readonly id: EntityId;
  readonly name: CardName;
  readonly createdAt: Timestamp;
  readonly lastModifiedAt: Timestamp;
  readonly description: CardDescription | undefined;
  readonly category: CardCategory | undefined;
  readonly dueDate: DueDate | undefined;

  constructor(fields: CardFields); // throws if id.realm !== 'card'

  withName(name: CardName, modifiedAt: Timestamp): Card;
  withDescription(description: CardDescription | undefined, modifiedAt: Timestamp): Card;
  withCategory(category: CardCategory | undefined, modifiedAt: Timestamp): Card;
  withDueDate(dueDate: DueDate | undefined, modifiedAt: Timestamp): Card;
  // Attempting to call withCreatedAt does not exist — field is not updatable.
}
```

`Card` constructor sets `createdAt` and `lastModifiedAt` to the same `createdAt` value provided in `fields`. The `with*` methods return a new `Card` with `createdAt` copied from the original and `lastModifiedAt` set to the provided `modifiedAt` timestamp.

#### `Column`

```typescript
class Column {
  readonly id: EntityId;    // realm must be 'column'
  readonly name: ColumnName;
  readonly cards: readonly Card[];

  constructor(fields: { id: EntityId; name: ColumnName; cards?: Card[] });

  /** Returns a new Column with the card inserted at the given zero-based index.
   *  Throws if index < 0 or index > cards.length. */
  withCardAt(index: number, card: Card): Column;

  /** Returns a new Column with the card with the given id removed.
   *  Throws if no card with that id exists. */
  withoutCard(cardId: EntityId): Column;

  /** Returns a new Column with cards in the given order.
   *  Throws if the provided array is not a permutation of the current cards. */
  withCardsReordered(newOrder: Card[]): Column;

  withName(name: ColumnName): Column;
}
```

`withCardsReordered` validates that `newOrder` contains exactly the same `Card` instances (compared by `id.equals()`) as the current `cards` array — same count, same members, any order.

#### `Board`

```typescript
class Board {
  readonly id: EntityId;       // realm must be 'board'
  readonly name: BoardName;
  readonly createdAt: Timestamp;
  readonly lastModifiedAt: Timestamp;
  readonly columns: readonly Column[];
  readonly description: BoardDescription | undefined;

  constructor(fields: {
    id: EntityId;
    name: BoardName;
    createdAt: Timestamp;
    description?: BoardDescription;
    columns?: Column[];
  });

  /** Inserts a column at the given zero-based index.
   *  Throws if index < 0 or index > columns.length. */
  withColumnAt(index: number, column: Column, modifiedAt: Timestamp): Board;

  /** Removes the column with the given id.
   *  Throws if no column with that id exists. */
  withoutColumn(columnId: EntityId, modifiedAt: Timestamp): Board;

  /** Replaces a column (identified by id) with a new Column instance.
   *  Used when a card inside the column is updated. Updates lastModifiedAt. */
  withUpdatedColumn(column: Column, modifiedAt: Timestamp): Board;

  withName(name: BoardName, modifiedAt: Timestamp): Board;
  withDescription(description: BoardDescription | undefined, modifiedAt: Timestamp): Board;
}
```

`Board` constructor sets both `createdAt` and `lastModifiedAt` to the provided `createdAt` value. No `Board` method can change `createdAt`.

### Domain Operation: `copyCard`

```typescript
function copyCard(
  source: Card,
  newId: EntityId,
  pasteAt: Timestamp
): Card;
```

- Throws if `newId.realm !== 'card'`.
- Returns a new `Card` with `id = newId`, `createdAt = pasteAt`, `lastModifiedAt = pasteAt`, and all other fields (`name`, `description`, `category`, `dueDate`) copied from `source`.

### Result Type

Defined in `src/domain/Result.ts` (or re-exported from `index.ts`). Used by the application layer — not by the domain itself, which throws directly:

```typescript
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function ok<T>(value: T): Result<T>;
function err(error: string): Result<never>;
```


## Data Models

### Entity ID encoding

```
<realm>#<hex>
 ├── realm: "board" | "column" | "card"
 └── hex: exactly 6 lowercase hex digits, zero-padded
           e.g. "000000", "0001a3", "ffff00"

Examples:
  "board#000000"
  "column#0001a3"
  "card#00dead"
```

### Card (in-memory)

```
Card {
  id:             EntityId  (realm = "card")
  name:           CardName
  createdAt:      Timestamp
  lastModifiedAt: Timestamp
  description?:   CardDescription
  category?:      CardCategory
  dueDate?:       DueDate
}
```

### Column (in-memory)

```
Column {
  id:    EntityId  (realm = "column")
  name:  ColumnName
  cards: Card[]    (ordered, position = array index)
}
```

### Board (in-memory)

```
Board {
  id:             EntityId  (realm = "board")
  name:           BoardName
  createdAt:      Timestamp
  lastModifiedAt: Timestamp
  description?:   BoardDescription
  columns:        Column[]  (ordered, position = array index)
}
```

### Domain invariants summary

| Object | Invariant |
|--------|-----------|
| `EntityId` | Matches `^(board\|column\|card)#[0-9a-f]{6}$` |
| `CardName`, `ColumnName`, `BoardName` | Non-empty, non-whitespace-only, ≤ 2048 code points |
| `CardDescription`, `BoardDescription` | ≤ 10,000 code points (empty allowed) |
| `CardCategory` | Non-empty, non-whitespace-only, ≤ 100 code points |
| `DueDate` | Year/month/day only, valid calendar date |
| `Timestamp` | Valid instant (finite epoch millis, not `NaN`); immutable, no aliased `Date` |
| `Card.id` | Realm must be `"card"` |
| `Column.id` | Realm must be `"column"` |
| `Board.id` | Realm must be `"board"` |
| `Board.createdAt` | Never changes after construction |
| `Card.createdAt` | Never changes after construction |
| `Column.cards` | No duplicate IDs |
| `Board.columns` | No duplicate IDs |



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: EntityId serialization round-trip

*For any* valid `EntityId`, calling `toString()` and then constructing a new `EntityId` from the resulting string produces an `EntityId` for which `equals()` returns `true` when compared to the original.

**Validates: Requirements 1.6**

---

### Property 2: EntityId counter encoding

*For any* realm (`"board"`, `"column"`, `"card"`) and any non-negative integer counter in [0, 0xFFFFFF], `makeEntityId(realm, counter).hex` equals `counter.toString(16).padStart(6, '0')`.

**Validates: Requirements 1.4**

---

### Property 3: EntityId structural equality

*For any* two valid `EntityId` values `a` and `b`, `a.equals(b)` returns `true` if and only if `a.realm === b.realm` and `a.hex === b.hex`.

**Validates: Requirements 1.5**

---

### Property 4: Invalid EntityId strings are rejected

*For any* string that does not match the pattern `^(board|column|card)#[0-9a-f]{6}$`, constructing an `EntityId` from that string throws an `Error`.

**Validates: Requirements 1.2**

---

### Property 5: Name value objects round-trip verbatim

*For any* non-empty, non-whitespace-only string of at most 2048 Unicode code points, constructing a `CardName`, `ColumnName`, or `BoardName` from that string and reading back the `.value` property returns the exact original string (no trimming, no normalization).

**Validates: Requirements 2.1, 2.5, 3.1, 3.5, 4.1, 4.5**

---

### Property 6: Name value objects reject whitespace-only inputs

*For any* string composed entirely of Unicode whitespace characters (including strings of length 0), constructing a `CardName`, `ColumnName`, or `BoardName` throws an `Error`.

**Validates: Requirements 2.2, 3.2, 4.2**

---

### Property 7: Name value objects equality is value-based

*For any* two valid name strings `a` and `b` of the same name type, `Name(a).equals(Name(b))` returns `true` if and only if `a === b` (case-sensitive, character-for-character).

**Validates: Requirements 2.4, 3.4, 4.4**

---

### Property 8: Description value objects round-trip verbatim

*For any* string of at most 10,000 Unicode code points (including the empty string), constructing a `CardDescription` or `BoardDescription` and reading back `.value` returns the exact original string.

**Validates: Requirements 5.1, 5.8, 6.1, 6.3**

---

### Property 9: CardCategory round-trips verbatim and rejects invalid inputs

*For any* non-empty, non-whitespace-only string of at most 100 Unicode code points, constructing a `CardCategory` and reading `.value` returns the exact original string. *For any* string that is empty, whitespace-only, or exceeds 100 code points, construction throws an `Error`.

**Validates: Requirements 5.3, 5.4, 5.5, 5.8**

---

### Property 10: DueDate round-trips year/month/day

*For any* valid calendar date expressed as `{ year, month, day }` where `month` ∈ [1, 12] and `day` is in the valid range for that month and year, constructing a `DueDate` and reading back `year`, `month`, and `day` returns the same integer values.

**Validates: Requirements 5.6, 5.8, 5.9**

---

### Property 11: DueDate rejects out-of-range and invalid inputs

*For any* object `{ year, month, day }` where `month` < 1, `month` > 12, `day` < 1, or `day` exceeds the number of days in the given month, constructing a `DueDate` throws an `Error`. Additionally, passing a `Date` object (which carries a time component) throws an `Error`.

**Validates: Requirements 5.6, 5.7**

---

### Property 12: Card construction timestamp invariant

*For any* valid card construction timestamp `t`, a newly constructed `Card` has `createdAt` equal to `t` and `lastModifiedAt` equal to `t`.

**Validates: Requirements 7.3**

---

### Property 13: Card and Board immutable update invariant

*For any* `Card` and any `with*` update operation providing a modification timestamp `t`, the returned `Card` has: (a) a different object reference from the original, (b) `createdAt` equal to the original's `createdAt`, and (c) `lastModifiedAt` equal to `t`. The same invariant holds for `Board`: *for any* `Board` and any structural update operation, the returned `Board` has `createdAt` unchanged and `lastModifiedAt` updated to the provided modification timestamp.

**Validates: Requirements 7.4, 9.3, 9.9**

---

### Property 14: Column card insertion invariant

*For any* `Column` with `n` cards and any valid zero-based index `i` in [0, n], calling `withCardAt(i, card)` returns a `Column` where `cards[i].id.equals(card.id)` is `true` and `cards.length === n + 1`. *For any* index `i` < 0 or `i` > n, `withCardAt` throws an `Error`.

**Validates: Requirements 8.3, 8.4, 8.8**

---

### Property 15: Column card removal invariant

*For any* `Column` containing a card with id `cid`, calling `withoutCard(cid)` returns a `Column` that contains no card with id `cid` and has exactly `n - 1` cards. The relative order of all remaining cards is preserved.

**Validates: Requirements 8.5, 8.8**

---

### Property 16: Column card reorder is a permutation

*For any* `Column` with cards `[c₀, …, cₙ₋₁]` and any permutation `p` of those exact card instances (same ids, any order), `withCardsReordered(p)` returns a `Column` with `cards` equal to `p`. *For any* array that is not a permutation of the current cards (different count, missing member, or added member), `withCardsReordered` throws an `Error`.

**Validates: Requirements 8.7**

---

### Property 17: Board column insertion invariant

*For any* `Board` with `n` columns and any valid zero-based index `i` in [0, n], calling `withColumnAt(i, column, ts)` returns a `Board` where `columns[i].id.equals(column.id)` is `true` and `columns.length === n + 1`. *For any* index `i` < 0 or `i` > n, `withColumnAt` throws an `Error`.

**Validates: Requirements 9.4, 9.5, 9.10**

---

### Property 18: Board column removal invariant

*For any* `Board` containing a column with id `cid`, calling `withoutColumn(cid, ts)` returns a `Board` that contains no column with id `cid` and has exactly `n - 1` columns. The relative order of all remaining columns is preserved.

**Validates: Requirements 9.6, 9.10**

---

### Property 19: Board `lastModifiedAt` updated on all structural changes

*For any* `Board` and any modification timestamp `ts`, every `Board` update operation (`withColumnAt`, `withoutColumn`, `withUpdatedColumn`, `withName`, `withDescription`) returns a `Board` with `lastModifiedAt === ts`.

**Validates: Requirements 9.4, 9.6, 9.8**

---

### Property 20: `copyCard` produces a correct copy

*For any* valid `Card` source, an `EntityId` with realm `"card"` (that differs from the source card's id), and a paste timestamp `ts`, `copyCard(source, newId, ts)` returns a `Card` where: `id.equals(newId)` is `true`, `createdAt === ts`, `lastModifiedAt === ts`, and `name`, `description`, `category`, `dueDate` are each equal to the corresponding field on the source (and absent if absent on the source).

**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

---

### Property 21: Timestamp is immutable and does not alias its source

*For any* `Date` `d`, constructing `Timestamp.of(d)` and then mutating `d` (e.g. `d.setFullYear(...)`) leaves the `Timestamp`'s `epochMillis` unchanged; likewise, mutating the `Date` returned by `toDate()` does not change the `Timestamp`. *For any* two `Timestamp` values, `a.equals(b)` is `true` if and only if `a.epochMillis === b.epochMillis`. Constructing from an invalid `Date` (`NaN` time) or a non-finite number throws an `Error`.

**Validates: Requirements 12.1, 12.2, 12.3**

---


## Error Handling

The domain layer does not use `Result` types internally. It throws `Error` directly when an invariant is violated. This keeps construction concise and moves the burden of wrapping to the application layer, which is the only caller of domain constructors.

### Throw conventions

| Scenario | Throw message (suggested) |
|----------|--------------------------|
| `EntityId` invalid format | `"Invalid EntityId: expected '<realm>#<hex>', got '<input>'"` |
| `EntityId` unknown realm | `"Invalid EntityId realm: '<realm>'"` |
| Name empty or whitespace | `"<TypeName> must not be empty or whitespace-only"` |
| Name exceeds max length | `"<TypeName> must be at most <N> code points, got <actual>"` |
| Description exceeds max length | `"<TypeName> must be at most <N> code points, got <actual>"` |
| `DueDate` datetime passed | `"DueDate does not accept Date objects; pass { year, month, day } instead"` |
| `DueDate` out-of-range | `"Invalid DueDate: month <m> does not have <d> days"` |
| `Timestamp` invalid instant | `"Invalid Timestamp: expected a valid Date or finite epoch millis"` |
| Entity id wrong realm | `"<Entity> id must have realm '<expected>', got '<actual>'"` |
| `Card.withCreatedAt` called | *(no method exposed — compile-time prevention)* |
| `Column.withCardAt` out of range | `"Card index <i> out of range [0, <n>]"` |
| `Column.withoutCard` not found | `"Card with id '<id>' not found in column"` |
| `Column.withCardsReordered` invalid | `"Reorder array must be a permutation of the current cards"` |
| `Board.withColumnAt` out of range | `"Column index <i> out of range [0, <n>]"` |
| `Board.withoutColumn` not found | `"Column with id '<id>' not found in board"` |
| `copyCard` wrong realm | `"copyCard newId must have realm 'card', got '<realm>'"` |
| `BoardDescription` null/undefined | `"BoardDescription value must not be null or undefined"` |

### Error propagation

The application layer wraps domain construction calls in `try/catch` and converts thrown `Error` objects to `{ ok: false, error: e.message }` result values. Domain errors are never exposed as unhandled exceptions to the UI.

### No silent failures

No domain operation silently succeeds with degraded data (no truncation, no coercion, no default substitution). If the input is invalid, the operation throws. This is a deliberate design choice: invalid state is impossible to represent.


## Testing Strategy

### Test framework

[Vitest](https://vitest.dev/) is the natural choice given the Vite + TypeScript project setup. For property-based testing, [fast-check](https://github.com/dubzzz/fast-check) integrates cleanly with Vitest and supports TypeScript natively.

Install:

```
npm install --save-dev vitest fast-check
```

Tests live in `src/domain/__tests__/` and can be run with:

```
npx vitest --run
```

### Dual testing approach

**Unit tests** cover:
- Specific examples demonstrating correct construction
- Error message text for each invariant violation
- Edge cases at exact boundaries (e.g., a name of exactly 2048 code points, a string of exactly 1 whitespace character)
- Integration points between entities (e.g., adding a `Card` to a `Column`, wrapping a `Column` in a `Board`)

**Property tests** cover:
- All 20 correctness properties above, each implemented as a single property-based test
- Each property test runs a minimum of 100 iterations
- Each test is tagged with a comment in the format:
  `// Feature: domain-model, Property <n>: <property_text>`

### Property-based test configuration

```typescript
// vitest.config.ts (or inline in tests)
import fc from 'fast-check';

// Run each property test with at least 100 examples
fc.configureGlobal({ numRuns: 100 });
```

### Generators to define

The following `fast-check` arbitrary generators will be shared across property tests:

| Generator | Description |
|-----------|-------------|
| `arbRealm` | One of `"board"`, `"column"`, `"card"` |
| `arbCounter` | Integer in [0, 0xFFFFFF] |
| `arbEntityId(realm?)` | Valid `EntityId` for a given or random realm |
| `arbValidName` | Non-empty, non-whitespace-only string ≤ 2048 code points |
| `arbCardName` | `CardName` from `arbValidName` |
| `arbColumnName` | `ColumnName` from `arbValidName` |
| `arbBoardName` | `BoardName` from `arbValidName` |
| `arbCardDescription` | `CardDescription` from string ≤ 10,000 code points |
| `arbCardCategory` | `CardCategory` from string ≤ 100 code points, non-whitespace-only |
| `arbDueDate` | `DueDate` from valid `{ year, month, day }` |
| `arbTimestamp` | `Timestamp` from a valid instant (finite epoch millis) |
| `arbCard` | Full `Card` with all required fields, optional fields randomly present |
| `arbColumn` | `Column` with 0–20 random cards |
| `arbBoard` | `Board` with 0–10 random columns |
| `arbWhitespaceOnly` | String of 1+ Unicode whitespace characters |
| `arbOverlongName` | String of 2049+ Unicode code points |

### Test file layout

```
src/domain/__tests__/
  EntityId.test.ts
  CardName.test.ts
  ColumnName.test.ts
  BoardName.test.ts
  CardDescription.test.ts
  BoardDescription.test.ts
  CardCategory.test.ts
  DueDate.test.ts
  Timestamp.test.ts
  Card.test.ts
  Column.test.ts
  Board.test.ts
  copyCard.test.ts
  generators.ts    ← shared fast-check arbitrary generators
```

### What is NOT property-tested

Requirements 11.1–11.3 (domain purity) are structural constraints enforced by:
- ESLint `no-restricted-imports` rules to prevent React/browser imports in `src/domain/`
- TypeScript `verbatimModuleSyntax` + strict settings that prevent accidental runtime side effects
- A CI step running `tsc --noEmit` and `eslint src/domain/`

These are checked by tooling, not by runtime property tests.
