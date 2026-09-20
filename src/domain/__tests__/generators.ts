/**
 * Shared fast-check arbitrary generators for domain model property tests.
 *
 * All generators produce fully constructed domain objects so property tests
 * can import them without repeating construction logic.
 *
 * NOTE: The domain modules imported below do not exist yet. TypeScript will
 * report "cannot find module" errors until those modules are created in later
 * tasks. Syntax/type errors *within* this file itself are not expected.
 */

import fc from 'fast-check';
import {
  CardId,
  ColumnId,
  BoardId,
  makeCardId,
  makeColumnId,
  makeBoardId,
} from '../EntityId';
import { CardName } from '../CardName';
import { ColumnName } from '../ColumnName';
import { BoardName } from '../BoardName';
import { CardDescription } from '../CardDescription';
import { BoardDescription } from '../BoardDescription';
import { CardCategory } from '../CardCategory';
import { DueDate } from '../DueDate';
import { Timestamp } from '../Timestamp';
import { Card } from '../Card';
import { Column } from '../Column';
import { Board } from '../Board';

// ---------------------------------------------------------------------------
// Primitive generators
// ---------------------------------------------------------------------------

/** One of the three valid realm strings. */
export const arbRealm: fc.Arbitrary<'board' | 'column' | 'card'> =
  fc.constantFrom('board', 'column', 'card');

/** Non-negative integer in [0, 0xFFFFFF] — valid counter range for the id factories. */
export const arbCounter: fc.Arbitrary<number> = fc.integer({
  min: 0,
  max: 0xffffff,
});

// ---------------------------------------------------------------------------
// Entity ids
// ---------------------------------------------------------------------------

/** Valid CardId from a counter in the full range. */
export const arbCardId: fc.Arbitrary<CardId> = arbCounter.map((counter) =>
  makeCardId(counter),
);

/** Valid ColumnId from a counter in the full range. */
export const arbColumnId: fc.Arbitrary<ColumnId> = arbCounter.map((counter) =>
  makeColumnId(counter),
);

/** Valid BoardId from a counter in the full range. */
export const arbBoardId: fc.Arbitrary<BoardId> = arbCounter.map((counter) =>
  makeBoardId(counter),
);

/**
 * A valid entity id of a random realm (CardId | ColumnId | BoardId), typed as
 * the shared base. Useful for exercising base behaviour (`equals`, `toString`)
 * across realms without committing to one specific id type.
 */
export const arbAnyEntityId: fc.Arbitrary<CardId | ColumnId | BoardId> =
  fc.oneof(arbCardId, arbColumnId, arbBoardId);

// ---------------------------------------------------------------------------
// Name strings and name value objects
// ---------------------------------------------------------------------------

/**
 * Non-empty, non-whitespace-only string of at most 2048 Unicode code points.
 * Filters out strings whose trimmed form is empty.
 */
export const arbValidName: fc.Arbitrary<string> = fc
  .string({ unit: 'grapheme', minLength: 1, maxLength: 2048 })
  .filter((s) => s.trim() !== '');

/** CardName constructed from a valid name string. */
export const arbCardName: fc.Arbitrary<CardName> = arbValidName.map((s) =>
  CardName.of(s),
);

/** ColumnName constructed from a valid name string. */
export const arbColumnName: fc.Arbitrary<ColumnName> = arbValidName.map((s) =>
  ColumnName.of(s),
);

/** BoardName constructed from a valid name string. */
export const arbBoardName: fc.Arbitrary<BoardName> = arbValidName.map((s) =>
  BoardName.of(s),
);

// ---------------------------------------------------------------------------
// Description value objects
// ---------------------------------------------------------------------------

/**
 * CardDescription from a string of at most 10,000 Unicode code points.
 * The empty string is a valid input.
 */
export const arbCardDescription: fc.Arbitrary<CardDescription> = fc
  .string({ unit: 'grapheme', minLength: 0, maxLength: 10_000 })
  .map((s) => CardDescription.of(s));

/**
 * BoardDescription from a string of at most 10,000 Unicode code points.
 * The empty string is a valid input.
 */
export const arbBoardDescription: fc.Arbitrary<BoardDescription> = fc
  .string({ unit: 'grapheme', minLength: 0, maxLength: 10_000 })
  .map((s) => BoardDescription.of(s));

// ---------------------------------------------------------------------------
// CardCategory
// ---------------------------------------------------------------------------

/**
 * CardCategory from a non-empty, non-whitespace-only string of at most 100
 * Unicode code points.
 */
export const arbCardCategory: fc.Arbitrary<CardCategory> = fc
  .string({ unit: 'grapheme', minLength: 1, maxLength: 100 })
  .filter((s) => s.trim() !== '')
  .map((s) => CardCategory.of(s));

// ---------------------------------------------------------------------------
// DueDate
// ---------------------------------------------------------------------------

/** Months and their maximum day counts (ignoring leap years for safety). */
const MONTH_MAX_DAYS: Record<number, number> = {
  1: 31,
  2: 28, // Safe default — avoids leap-year edge cases in generators
  3: 31,
  4: 30,
  5: 31,
  6: 30,
  7: 31,
  8: 31,
  9: 30,
  10: 31,
  11: 30,
  12: 31,
};

/**
 * DueDate from a valid { year, month, day } triple.
 * Uses a safe February day limit (28) to avoid leap-year complexity.
 */
export const arbDueDate: fc.Arbitrary<DueDate> = fc
  .integer({ min: 1, max: 12 })
  .chain((month) => {
    const maxDay = MONTH_MAX_DAYS[month];
    return fc.tuple(
      fc.integer({ min: 1900, max: 2100 }), // year
      fc.constant(month),
      fc.integer({ min: 1, max: maxDay }), // day
    );
  })
  .map(([year, month, day]) => DueDate.of({ year, month, day }));

// ---------------------------------------------------------------------------
// Timestamp
// ---------------------------------------------------------------------------

/**
 * Timestamp from a valid instant. Built from `fc.date()`, which produces valid
 * Date instances; `Timestamp.of` reads the instant and discards the reference.
 */
export const arbTimestamp: fc.Arbitrary<Timestamp> = fc
  .date({ noInvalidDate: true })
  .map((d) => Timestamp.of(d));

// ---------------------------------------------------------------------------
// Card entity
// ---------------------------------------------------------------------------

/**
 * Full Card with all required fields. Optional fields are randomly present.
 * `createdAt` and `lastModifiedAt` are both set to the same Date instance
 * (matching the Card construction invariant).
 */
export const arbCard: fc.Arbitrary<Card> = fc
  .tuple(
    arbCardId,
    arbCardName,
    arbTimestamp,
    fc.option(arbCardDescription, { nil: undefined }),
    fc.option(arbCardCategory, { nil: undefined }),
    fc.option(arbDueDate, { nil: undefined }),
  )
  .map(([id, name, createdAt, description, category, dueDate]) => {
    return Card.create({
      id,
      name,
      createdAt, // create sets both createdAt and lastModifiedAt to this value
      ...(description !== undefined ? { description } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(dueDate !== undefined ? { dueDate } : {}),
    });
  });

// ---------------------------------------------------------------------------
// Column entity
// ---------------------------------------------------------------------------

/**
 * Column with 0–20 random cards. Card IDs are made unique by generating each
 * card with its own counter derived from the array index, ensuring no duplicate
 * IDs within the column.
 */
export const arbColumn: fc.Arbitrary<Column> = fc
  .tuple(
    arbColumnId,
    arbColumnName,
    fc.integer({ min: 0, max: 20 }).chain((cardCount) => {
      if (cardCount === 0) return fc.constant([] as Card[]);

      // Generate card count unique counters from the full range, then build cards
      return fc
        .uniqueArray(fc.integer({ min: 0, max: 0xffffff }), {
          minLength: cardCount,
          maxLength: cardCount,
        })
        .chain((counters) => {
          const cardArbs = counters.map((counter) =>
            fc
              .tuple(
                fc.constant(makeCardId(counter)),
                arbCardName,
                arbTimestamp,
                fc.option(arbCardDescription, { nil: undefined }),
                fc.option(arbCardCategory, { nil: undefined }),
                fc.option(arbDueDate, { nil: undefined }),
              )
              .map(([id, name, createdAt, description, category, dueDate]) =>
                Card.create({
                  id,
                  name,
                  createdAt,
                  ...(description !== undefined ? { description } : {}),
                  ...(category !== undefined ? { category } : {}),
                  ...(dueDate !== undefined ? { dueDate } : {}),
                }),
              ),
          );
          return fc.tuple(...(cardArbs as [fc.Arbitrary<Card>, ...fc.Arbitrary<Card>[]])) as fc.Arbitrary<Card[]>;
        });
    }),
  )
  .map(([id, name, cards]) =>
    Column.create({ id, name, cards: cards as Card[] }),
  );

// ---------------------------------------------------------------------------
// Board entity
// ---------------------------------------------------------------------------

/**
 * Board with 0–10 random columns. Column IDs are made unique by using
 * distinct counters, mirroring the same strategy used in arbColumn.
 */
export const arbBoard: fc.Arbitrary<Board> = fc
  .tuple(
    arbBoardId,
    arbBoardName,
    arbTimestamp,
    fc.option(arbBoardDescription, { nil: undefined }),
    fc.integer({ min: 0, max: 10 }).chain((colCount) => {
      if (colCount === 0) return fc.constant([] as Column[]);

      return fc
        .uniqueArray(fc.integer({ min: 0, max: 0xffffff }), {
          minLength: colCount,
          maxLength: colCount,
        })
        .chain((counters) => {
          const colArbs = counters.map((counter) =>
            fc
              .tuple(
                fc.constant(makeColumnId(counter)),
                arbColumnName,
                fc.integer({ min: 0, max: 5 }).chain((cardCount) => {
                  if (cardCount === 0) return fc.constant([] as Card[]);
                  return fc
                    .uniqueArray(fc.integer({ min: 0, max: 0xffffff }), {
                      minLength: cardCount,
                      maxLength: cardCount,
                    })
                    .chain((cardCounters) => {
                      const cardArbs = cardCounters.map((cc) =>
                        fc
                          .tuple(
                            fc.constant(makeCardId(cc)),
                            arbCardName,
                            arbTimestamp,
                          )
                          .map(([id, name, createdAt]) =>
                            Card.create({ id, name, createdAt }),
                          ),
                      );
                      return fc.tuple(...(cardArbs as [fc.Arbitrary<Card>, ...fc.Arbitrary<Card>[]])) as fc.Arbitrary<Card[]>;
                    });
                }),
              )
              .map(([id, name, cards]) =>
                Column.create({ id, name, cards: cards as Card[] }),
              ),
          );
          return fc.tuple(...(colArbs as [fc.Arbitrary<Column>, ...fc.Arbitrary<Column>[]])) as fc.Arbitrary<Column[]>;
        });
    }),
  )
  .map(([id, name, createdAt, description, columns]) =>
    Board.create({
      id,
      name,
      createdAt,
      ...(description !== undefined ? { description } : {}),
      columns: columns as Column[],
    }),
  );

// ---------------------------------------------------------------------------
// Negative-case generators
// ---------------------------------------------------------------------------

/**
 * String of 1 or more Unicode whitespace characters only.
 * Covers the common whitespace set including non-breaking spaces.
 * Uses fc.array + join because fc.stringOf is not available in fast-check 4.x.
 */
export const arbWhitespaceOnly: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r', '\u00A0', '\u2003'), {
    minLength: 1,
    maxLength: 20,
  })
  .map((chars) => chars.join(''));

/**
 * String of 2049–3000 Unicode code points — exceeds the 2048-code-point
 * limit for name value objects.
 */
export const arbOverlongName: fc.Arbitrary<string> = fc.string({
  unit: 'grapheme',
  minLength: 2049,
  maxLength: 3000,
});
