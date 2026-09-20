

# Requirements Document


## Introduction

This document defines requirements for the domain model layer of **happy-little-accident**, a local-first kanban board application. The domain model is a pure TypeScript library with zero external dependencies. It provides all entities (Board, Column, Card), their value objects (IDs, names, descriptions, etc.), validation rules, and copy semantics that the rest of the application depends on. The domain layer must enforce all invariants at construction time so that invalid state can never be represented.


## Glossary

- **Board**: The top-level entity representing a kanban board. Contains an ordered list of columns.
- **Column**: A named grouping within a board. Contains an ordered list of cards.
- **Card**: An individual work item belonging to exactly one column.
- **Entity_ID**: A stable, unique identifier of the form `<realm>#<hex>`, where realm is `board`, `column`, or `card`, and hex is a zero-padded 6-digit lowercase hexadecimal encoding of a per-realm monotonically incrementing counter.
- **Value_Object**: An immutable domain type that wraps a primitive, enforces its invariants on construction, and compares by value rather than by reference.
- **Domain_Model**: The `src/domain/` layer — pure TypeScript with no React, browser, or npm dependencies.
- **Copy_Semantics**: The rules governing how a card is duplicated: a fresh ID and timestamps, with all other fields copied as-is.
- **Result_Type**: A discriminated union `{ ok: true; value: T } | { ok: false; error: string }` used by the application layer to surface domain errors without throwing.


## Requirements


### Requirement 1: Entity Identifiers

**User Story:** As a developer, I want every entity to have a stable, unique, typed identifier, so that entities can be referenced and compared without ambiguity.

#### Acceptance Criteria

1. THE Domain_Model SHALL provide an `EntityId` value object that stores an `Entity_ID` string in the form `<realm>#<hex>`, where `realm` is one of `board`, `column`, or `card`, and `hex` is exactly 6 lowercase hexadecimal characters (`0–9`, `a–f`).
2. WHEN an `EntityId` is constructed with a string that does not match the `<realm>#<hex>` format, THE Domain_Model SHALL throw an error indicating which part of the format was violated (realm or hex).
3. WHEN an `EntityId` is constructed with a valid string, THE Domain_Model SHALL store the value immutably such that the realm and hex parts cannot be modified after construction.
4. THE Domain_Model SHALL provide a factory function that, given a realm and a per-realm monotonic counter, generates a new `EntityId` by encoding the next counter value as a zero-padded 6-digit lowercase hexadecimal string; the counter starts at 0 and increments by 1 on each call.
5. THE Domain_Model SHALL expose an `equals` method on `EntityId` that returns `true` if and only if both the realm and hex parts of the two compared `EntityId` values are identical, and `false` otherwise.
6. FOR ALL valid `EntityId` values, serialising to string then constructing a new `EntityId` from that string SHALL produce an `EntityId` for which `equals` returns `true` when compared to the original.


### Requirement 2: Card Name Value Object

**User Story:** As a developer, I want card names to be validated and encapsulated in a value object, so that invalid names can never be stored on a card.

#### Acceptance Criteria

1. THE Domain_Model SHALL provide a `CardName` value object that accepts a non-empty string of at most 2048 Unicode code points and stores the value verbatim without trimming.
2. IF a `CardName` is constructed with an empty string or a string consisting solely of Unicode whitespace characters, THEN THE Domain_Model SHALL throw an Error.
3. IF a `CardName` is constructed with a string longer than 2048 Unicode code points, THEN THE Domain_Model SHALL throw an Error.
4. THE Domain_Model SHALL expose an `equals` method on `CardName` that returns `true` if and only if both instances hold the exact same string value using case-sensitive, character-for-character comparison.
5. THE Domain_Model SHALL store the `CardName` value verbatim such that reading the value back after construction returns the exact string that was passed to the constructor.


### Requirement 3: Column Name Value Object

**User Story:** As a developer, I want column names to follow the same constraints as card names, so that consistency is enforced across naming in the domain.

#### Acceptance Criteria

1. THE Domain_Model SHALL provide a `ColumnName` value object that accepts a non-empty string of at most 2048 Unicode code points and stores the value verbatim without trimming.
2. IF a `ColumnName` is constructed with an empty string or a string consisting solely of Unicode whitespace characters, THEN THE Domain_Model SHALL throw an Error.
3. IF a `ColumnName` is constructed with a string longer than 2048 Unicode code points, THEN THE Domain_Model SHALL throw an Error.
4. THE Domain_Model SHALL expose an `equals` method on `ColumnName` that returns `true` if and only if both instances hold the exact same string value using case-sensitive, character-for-character comparison.
5. THE Domain_Model SHALL store the `ColumnName` value verbatim such that reading the value back after construction returns the exact string that was passed to the constructor.


### Requirement 4: Board Name Value Object

**User Story:** As a developer, I want board names to follow the same constraints as card and column names, so that naming rules are uniform across all entities.

#### Acceptance Criteria

1. THE Domain_Model SHALL provide a `BoardName` value object that accepts a non-empty string of at most 2048 Unicode code points and stores the value verbatim without trimming.
2. IF a `BoardName` is constructed with an empty string or a string consisting solely of Unicode whitespace characters, THEN THE Domain_Model SHALL throw an Error.
3. IF a `BoardName` is constructed with a string longer than 2048 Unicode code points, THEN THE Domain_Model SHALL throw an Error.
4. THE Domain_Model SHALL expose an `equals` method on `BoardName` that returns `true` if and only if both instances hold the exact same string value using case-sensitive, character-for-character comparison.
5. THE Domain_Model SHALL store the `BoardName` value verbatim such that reading the value back after construction returns the exact string that was passed to the constructor.


### Requirement 5: Optional Card Fields Value Objects

**User Story:** As a developer, I want optional card fields (description, category, due date) to be encapsulated in value objects with their own invariants, so that partial or invalid data cannot be assigned to a card.

#### Acceptance Criteria

1. THE Domain_Model SHALL provide a `CardDescription` value object that accepts a string of at most 10,000 Unicode code points, including the empty string.
2. IF a `CardDescription` is constructed with a string longer than 10,000 Unicode code points, THEN THE Domain_Model SHALL throw an Error.
3. THE Domain_Model SHALL provide a `CardCategory` value object that accepts a non-empty string of at most 100 Unicode code points and stores the value verbatim without stripping leading or trailing whitespace; a string consisting solely of whitespace is rejected.
4. IF a `CardCategory` is constructed with an empty string or a string consisting solely of Unicode whitespace characters, THEN THE Domain_Model SHALL throw an Error.
5. IF a `CardCategory` is constructed with a string longer than 100 Unicode code points, THEN THE Domain_Model SHALL throw an Error.
6. THE Domain_Model SHALL provide a `DueDate` value object that accepts a year-month-day date value with no time component; inputs that include a time component (e.g., a datetime) SHALL be rejected, not silently truncated.
7. IF a `DueDate` is constructed with a value that does not represent a valid calendar date — including datetimes, out-of-range month values (outside 1–12), out-of-range day values for the given month, or non-date primitives — THEN THE Domain_Model SHALL throw an Error.
8. THE Domain_Model SHALL store `CardDescription`, `CardCategory`, and `DueDate` values verbatim such that reading each value back after construction returns the original input.
9. THE Domain_Model SHALL expose the year, month, and day of a `DueDate` as individually readable integer values.


### Requirement 6: Board Description Value Object

**User Story:** As a developer, I want board descriptions to be encapsulated in a value object with the same length limit as card descriptions, so that the constraint is consistently enforced.

#### Acceptance Criteria

1. THE Domain_Model SHALL provide a `BoardDescription` value object that accepts a string of at most 10,000 Unicode code points, including the empty string.
2. IF a `BoardDescription` is constructed with a string longer than 10,000 Unicode code points, THEN THE Domain_Model SHALL throw an Error.
3. THE Domain_Model SHALL store the `BoardDescription` value verbatim such that reading the `.value` property after construction returns the exact string that was passed to the constructor.
4. IF a `BoardDescription` is constructed with a `null` or `undefined` value, THEN THE Domain_Model SHALL throw an Error.


### Requirement 7: Card Entity

**User Story:** As a developer, I want a `Card` entity that aggregates its required and optional fields, so that all card data is held in one well-defined structure.

#### Acceptance Criteria

1. THE Domain_Model SHALL provide a `Card` entity with required fields: `id` (`EntityId` with realm `card`), `name` (`CardName`), `createdAt` (`Timestamp`, immutable after creation) and `lastModifiedAt` (`Timestamp`); both are `Timestamp` value objects (Requirement 12) so that a timestamp shared by reference cannot be mutated after construction.
2. THE Domain_Model SHALL provide optional fields on `Card`: `description` (`CardDescription`), `category` (`CardCategory`), and `dueDate` (`DueDate`).
3. WHEN a `Card` is created with a caller-supplied creation timestamp, THE Domain_Model SHALL set both `createdAt` and `lastModifiedAt` to that same timestamp.
4. WHEN any field on a `Card` is updated with a caller-supplied modification timestamp, THE Domain_Model SHALL return a new `Card` instance with the updated field, `lastModifiedAt` set to the provided modification timestamp, and `createdAt` unchanged from the original instance.
5. IF an update operation attempts to modify the `createdAt` field of a `Card`, THEN THE Domain_Model SHALL throw an Error.


### Requirement 8: Column Entity

**User Story:** As a developer, I want a `Column` entity that holds an ordered list of cards, so that card ordering within a column is managed in one place.

#### Acceptance Criteria

1. THE Domain_Model SHALL provide a `Column` entity with required fields: `id` (`EntityId` with realm `column`), `name` (`ColumnName`), and an ordered array of `Card` instances (`cards`).
2. WHEN a `Column` is created with no cards, THE Domain_Model SHALL initialise the `cards` array as empty.
3. WHEN a card is added to a `Column` at a valid zero-based index between 0 and the current card count (inclusive), THE Domain_Model SHALL return a new `Column` instance with the card inserted at that index and all subsequent cards shifted one position higher, without mutating the original.
4. IF a card is added to a `Column` at an index less than 0 or greater than the current card count, THEN THE Domain_Model SHALL throw an Error indicating the position is out of range.
5. WHEN a card is removed from a `Column` by a card `id` that exists in the column, THE Domain_Model SHALL return a new `Column` instance with that card absent and the relative order of all remaining cards preserved.
6. IF a card is removed from a `Column` by a card `id` that does not exist in the column, THEN THE Domain_Model SHALL throw an Error indicating the card was not found.
7. WHEN cards within a `Column` are reordered, THE Domain_Model SHALL return a new `Column` instance containing exactly the same set of `Card` instances in the new order, rejecting the operation if the provided order does not contain exactly the same cards.
8. THE Domain_Model SHALL ensure that after a card add operation the resulting `Column` has exactly one more card than the original, and after a card remove operation the resulting `Column` has exactly one fewer card than the original.


### Requirement 9: Board Entity

**User Story:** As a developer, I want a `Board` entity that holds an ordered list of columns and tracks modification timestamps, so that all board-level data and hierarchy are managed in one structure.

#### Acceptance Criteria

1. THE Domain_Model SHALL provide a `Board` entity with required fields: `id` (`EntityId` with realm `board`), `name` (`BoardName`), `createdAt` (`Timestamp`, immutable after creation), `lastModifiedAt` (`Timestamp`), and an ordered array of `Column` instances (`columns`).
2. THE Domain_Model SHALL provide an optional `description` (`BoardDescription`) field on `Board`.
3. WHEN a `Board` is created, THE Domain_Model SHALL set `createdAt` and `lastModifiedAt` to the same provided creation timestamp.
4. WHEN a `Column` is added to a `Board` at a valid zero-based position index between 0 and the current column count (inclusive), THE Domain_Model SHALL return a new `Board` instance with the column inserted at that index, all subsequent columns shifted one position higher, and `lastModifiedAt` updated to the provided modification timestamp.
5. IF a `Column` is added to a `Board` at a position index less than 0 or greater than the current column count, THEN THE Domain_Model SHALL reject the operation with an error indicating the position is out of range, leaving the original `Board` instance unchanged.
6. WHEN a `Column` is removed from a `Board` by a column `id` that exists on the board, THE Domain_Model SHALL return a new `Board` instance with that column absent, the relative order of remaining columns preserved, and `lastModifiedAt` updated to the provided modification timestamp.
7. IF a `Column` is removed from a `Board` by a column `id` that does not exist on the board, THEN THE Domain_Model SHALL reject the operation with an error indicating the column was not found, leaving the original `Board` instance unchanged.
8. WHEN a card within any column of a `Board` is added, removed, or has any of its fields updated, THE Domain_Model SHALL return a new `Board` instance with `lastModifiedAt` updated to the timestamp of that card modification.
9. THE Domain_Model SHALL ensure that `createdAt` on a `Board` is never modified after initial creation.
10. THE Domain_Model SHALL ensure that after a column add operation the resulting `Board` has exactly one more column than the original, and after a column remove operation the resulting `Board` has exactly one fewer column than the original.


### Requirement 10: Card Copy Semantics

**User Story:** As a developer, I want a domain operation that duplicates a card according to the copy/paste rules, so that the application layer can implement clipboard paste without reimplementing copy logic.

#### Acceptance Criteria

1. THE Domain_Model SHALL provide a `copyCard` operation that takes a source `Card`, a new `EntityId` with realm `card`, and a paste timestamp, and returns a new `Card`.
2. WHEN `copyCard` is called, THE Domain_Model SHALL assign the provided new `EntityId` to the returned card.
3. WHEN `copyCard` is called, THE Domain_Model SHALL set both `createdAt` and `lastModifiedAt` on the returned card to the provided paste timestamp.
4. WHEN `copyCard` is called, THE Domain_Model SHALL copy `name`, `description`, `category`, and `dueDate` from the source card to the returned card unchanged; if any optional field is absent on the source card, it SHALL be absent on the returned card.
5. THE Domain_Model SHALL ensure that the `id` of the returned card from `copyCard` is not equal to the `id` of the source card.
6. IF `copyCard` is called with an `EntityId` whose realm is not `card`, THEN THE Domain_Model SHALL throw an Error.


### Requirement 11: Domain Model Purity

**User Story:** As a developer, I want the domain model to have zero external dependencies, so that it remains portable, testable in isolation, and free from framework churn.

#### Acceptance Criteria

1. THE Domain_Model SHALL contain no runtime imports from React, browser APIs, or any package listed in the project's `dependencies` or `devDependencies`; type-only imports (erased at compile time) are exempt from this constraint.
2. THE Domain_Model SHALL contain no statements that execute at module load time other than pure declarations (variable, type, class, and function declarations initialized with literal values or other pure expressions); specifically, network calls, DOM access, timer registration, and file system access are prohibited at module load time.
3. THE Domain_Model SHALL not read from or write to any external storage, network endpoint, file system, or console output during execution; throwing an exception to signal an invariant violation is not considered I/O and is permitted.


### Requirement 12: Timestamp Value Object

**User Story:** As a developer, I want creation and modification timestamps to be encapsulated in an immutable value object, so that a timestamp shared by reference (e.g. between a card and its copy) cannot be mutated through one holder and corrupt the other.

#### Acceptance Criteria

1. THE Domain_Model SHALL provide a `Timestamp` value object that represents a single instant in time and cannot be mutated after construction, including through any value it hands back.
2. IF a `Timestamp` is constructed from a value that does not represent a valid instant, THEN THE Domain_Model SHALL throw an Error.
3. THE Domain_Model SHALL expose an `equals` method on `Timestamp` that returns `true` if and only if both instances represent the same instant.
4. THE Domain_Model SHALL use `Timestamp` for the `createdAt` and `lastModifiedAt` fields of `Card` and `Board`.
