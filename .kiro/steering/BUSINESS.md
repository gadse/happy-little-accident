---
inclusion: auto
name: business
description: Domain rules and entity definitions
---


# Business Rules


## Hierarchy

Board → Column → Card

- A board contains an ordered list of columns.
- A column belongs to exactly one board.
- A column contains an ordered list of cards.
- A card belongs to exactly one column.


## Identifiers

Every entity has a stable, unique ID of the form `<realm>#<hex>`, where:

- `<realm>` is the entity type: `board`, `column`, or `card`.
- `<hex>` is a zero-padded 6-digit lowercase hexadecimal encoding of a per-realm monotonically incrementing counter (e.g. `board#00003a`).

Rules:
- IDs are unique within their realm (e.g. no two boards share the same hex part).
- IDs are generated from a per-realm counter that starts at 0 and increments by 1 on each new entity. The next counter value is encoded as a zero-padded 6-digit lowercase hexadecimal string.
- IDs are assigned at creation and never change.


## Entities


### Card

Required fields:
- `id`: a `card#<hex>` identifier
- `name`: non-empty string, max 2048 characters
- `createdAt`: datetime, set once at creation, never modified
- `lastModifiedAt`: datetime, updated on every change to the card

Optional fields:
- `description`: string, max 10,000 characters
- `category`: non-empty string if present, max 100 characters
- `dueDate`: date (no time component)


### Column

Required fields:
- `id`: a `column#<hex>` identifier
- `name`: non-empty string, max 2048 characters
- `cards`: ordered list of cards (may be empty)


### Board

Required fields:
- `id`: a `board#<hex>` identifier
- `name`: non-empty string, max 2048 characters
- `createdAt`: datetime, set once at creation, never modified
- `lastModifiedAt`: datetime, updated on every change to the board or any of its columns or cards
- `columns`: ordered list of columns (may be empty)

Optional fields:
- `description`: string, max 10,000 characters


## Copy Semantics

When a card is copied and pasted:
- The new card receives a freshly generated ID.
- `createdAt` and `lastModifiedAt` are set to the time of the paste operation.
- All other fields (name, description, category, due date) are copied as-is.
