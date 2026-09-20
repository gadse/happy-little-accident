import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Board } from '../Board';
import { Column } from '../Column';
import { makeBoardId, makeCardId, makeColumnId } from '../EntityId';
import { BoardName } from '../BoardName';
import { BoardDescription } from '../BoardDescription';
import { ColumnName } from '../ColumnName';
import { Timestamp } from '../Timestamp';
import { arbBoard, arbBoardName, arbBoardDescription, arbTimestamp } from './generators';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a simple Column with a deterministic id from a counter. Column ids
 * produced by `arbBoard` come from counters in [0, 0xFFFFFF]; scanning for a
 * free counter keeps a "fresh" column's id from colliding with existing ones.
 */
function makeColumn(counter: number, name = 'fresh column'): Column {
  return Column.create({
    id: makeColumnId(counter),
    name: ColumnName.of(name),
  });
}

function boardOf(
  columns: Column[],
  createdAt: Timestamp = Timestamp.of(new Date('2026-01-01T00:00:00.000Z')),
): Board {
  return Board.create({
    id: makeBoardId(1),
    name: BoardName.of('My Board'),
    createdAt,
    columns,
  });
}

/**
 * Returns a Column whose id is guaranteed not to collide with any column
 * already present in `board`.
 */
function freshColumnFor(board: Board): Column {
  const used = new Set(board.columns.map((c) => c.id.hex));
  let counter = 0xffffff;
  while (used.has(makeColumnId(counter).hex)) {
    counter -= 1;
  }
  return makeColumn(counter);
}

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

describe('Board — property-based', () => {
  // Feature: domain-model, Property 13 (Board): Board immutable update invariant — For any Board and any structural update operation providing a modification timestamp t, the returned Board has a different object reference, createdAt equal to the original's createdAt, and lastModifiedAt equal to t.
  it('Property 13 (Board): every update returns a new object with createdAt unchanged and lastModifiedAt === t', () => {
    fc.assert(
      fc.property(arbBoard, arbTimestamp, arbBoardName, arbBoardDescription, (board, t, name, description) => {
        const fresh = freshColumnFor(board);
        const updates: Board[] = [
          board.withColumnAt(0, fresh, t),
          board.withName(name, t),
          board.withDescription(description, t),
        ];
        // withoutColumn / withUpdatedColumn require an existing column.
        if (board.columns.length > 0) {
          const existing = board.columns[0];
          updates.push(board.withoutColumn(existing.id, t));
          updates.push(board.withUpdatedColumn(existing, t));
        }

        for (const updated of updates) {
          expect(updated).not.toBe(board);
          expect(updated.createdAt).toBe(board.createdAt);
          expect(updated.lastModifiedAt).toBe(t);
        }
      }),
    );
  });

  // Feature: domain-model, Property 17: Board column insertion invariant — For any Board with n columns and any valid zero-based index i in [0, n], withColumnAt(i, column, ts) returns a Board where columns[i].id.equals(column.id) is true and columns.length === n + 1. For any index i < 0 or i > n, withColumnAt throws an Error.
  it('Property 17: valid index inserts the column at the correct position and grows by one', () => {
    fc.assert(
      fc.property(arbBoard, arbTimestamp, (board, ts) => {
        const n = board.columns.length;
        const column = freshColumnFor(board);
        for (let i = 0; i <= n; i++) {
          const result = board.withColumnAt(i, column, ts);
          expect(result.columns.length).toBe(n + 1);
          expect(result.columns[i].id.equals(column.id)).toBe(true);
        }
      }),
    );
  });

  it('Property 17: out-of-range index throws', () => {
    fc.assert(
      fc.property(arbBoard, arbTimestamp, (board, ts) => {
        const n = board.columns.length;
        const column = freshColumnFor(board);
        expect(() => board.withColumnAt(-1, column, ts)).toThrow();
        expect(() => board.withColumnAt(n + 1, column, ts)).toThrow();
      }),
    );
  });

  // Feature: domain-model, Property 18: Board column removal invariant — For any Board containing a column with id cid, withoutColumn(cid, ts) returns a Board that contains no column with id cid and has exactly n-1 columns; the relative order of remaining columns is preserved.
  it('Property 18: removing an existing column drops it, shrinks by one, and preserves order', () => {
    fc.assert(
      fc.property(
        arbBoard.filter((b) => b.columns.length > 0),
        fc.integer({ min: 0, max: 1_000_000 }),
        arbTimestamp,
        (board, pick, ts) => {
          const n = board.columns.length;
          const target = board.columns[pick % n];
          const result = board.withoutColumn(target.id, ts);

          expect(result.columns.length).toBe(n - 1);
          expect(result.columns.some((c) => c.id.equals(target.id))).toBe(false);

          // Relative order of remaining columns preserved.
          const expected = board.columns
            .filter((c) => !c.id.equals(target.id))
            .map((c) => c.id.toString());
          const actual = result.columns.map((c) => c.id.toString());
          expect(actual).toEqual(expected);
        },
      ),
    );
  });

  // Feature: domain-model, Property 19: Board lastModifiedAt updated on all structural changes — For any Board and any modification timestamp ts, every update operation (withColumnAt, withoutColumn, withUpdatedColumn, withName, withDescription) returns a Board with lastModifiedAt === ts.
  it('Property 19: every update method sets lastModifiedAt === ts', () => {
    fc.assert(
      fc.property(
        arbBoard.filter((b) => b.columns.length > 0),
        arbTimestamp,
        arbBoardName,
        arbBoardDescription,
        (board, ts, name, description) => {
          const existing = board.columns[0];
          const fresh = freshColumnFor(board);
          const results: Board[] = [
            board.withColumnAt(0, fresh, ts),
            board.withoutColumn(existing.id, ts),
            board.withUpdatedColumn(existing, ts),
            board.withName(name, ts),
            board.withDescription(description, ts),
          ];
          for (const result of results) {
            expect(result.lastModifiedAt).toBe(ts);
          }
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('Board — construction', () => {
  it('defaults columns to an empty array when omitted', () => {
    const board = Board.create({
      id: makeBoardId(0),
      name: BoardName.of('Backlog Board'),
      createdAt: Timestamp.of(new Date('2026-01-01T00:00:00.000Z')),
    });
    expect(board.columns).toEqual([]);
  });

  it('sets createdAt and lastModifiedAt to the provided createdAt', () => {
    const t = Timestamp.of(new Date('2026-01-01T00:00:00.000Z'));
    const board = boardOf([], t);
    expect(board.createdAt).toBe(t);
    expect(board.lastModifiedAt).toBe(t);
  });

  it('rejects a wrong-realm id at compile time (type-level guarantee)', () => {
    const t = Timestamp.of(new Date());
    Board.create({
      // @ts-expect-error a CardId cannot be passed where Board.create expects a BoardId.
      id: makeCardId(1),
      name: BoardName.of('x'),
      createdAt: t,
    });
  });

  it('retains a supplied description', () => {
    const board = Board.create({
      id: makeBoardId(0),
      name: BoardName.of('Board'),
      createdAt: Timestamp.of(new Date()),
      description: BoardDescription.of('a board'),
    });
    expect(board.description?.value).toBe('a board');
  });
});

describe('Board — createdAt immutability', () => {
  const t0 = Timestamp.of(new Date('2026-01-01T00:00:00.000Z'));
  const t1 = Timestamp.of(new Date('2026-02-01T00:00:00.000Z'));
  const t2 = Timestamp.of(new Date('2026-03-01T00:00:00.000Z'));

  it('preserves createdAt across chained updates', () => {
    const a = makeColumn(1, 'a');
    const board = boardOf([a], t0);
    const fresh = makeColumn(2, 'b');

    const chained = board
      .withColumnAt(1, fresh, t1)
      .withName(BoardName.of('Renamed'), t2)
      .withDescription(BoardDescription.of('desc'), t2);

    expect(chained.createdAt).toBe(t0);
    expect(chained.lastModifiedAt).toBe(t2);
    // original untouched
    expect(board.createdAt).toBe(t0);
    expect(board.lastModifiedAt).toBe(t0);
  });
});

describe('Board — withColumnAt', () => {
  it('adds a column to an empty board at index 0', () => {
    const board = boardOf([]);
    const column = makeColumn(10);
    const result = board.withColumnAt(0, column, Timestamp.of(new Date()));
    expect(result.columns.length).toBe(1);
    expect(result.columns[0].id.equals(column.id)).toBe(true);
  });

  it('throws for index -1 with the range message', () => {
    const board = boardOf([makeColumn(1)]);
    expect(() => board.withColumnAt(-1, makeColumn(2), Timestamp.of(new Date()))).toThrow(
      'Column index -1 out of range [0, 1]',
    );
  });

  it('throws for index length + 1 with the range message', () => {
    const board = boardOf([makeColumn(1)]);
    expect(() => board.withColumnAt(2, makeColumn(2), Timestamp.of(new Date()))).toThrow(
      'Column index 2 out of range [0, 1]',
    );
  });
});

describe('Board — withoutColumn', () => {
  it('removes the only column from a single-column board', () => {
    const only = makeColumn(1);
    const board = boardOf([only]);
    const result = board.withoutColumn(only.id, Timestamp.of(new Date()));
    expect(result.columns).toEqual([]);
  });

  it('throws when the id is not present', () => {
    const board = boardOf([makeColumn(1)]);
    const missing = makeColumnId(99);
    expect(() => board.withoutColumn(missing, Timestamp.of(new Date()))).toThrow(
      `Column with id '${missing.toString()}' not found in board`,
    );
  });
});

describe('Board — withUpdatedColumn', () => {
  it('replaces the column sharing the same id', () => {
    const original = makeColumn(1, 'To Do');
    const board = boardOf([original, makeColumn(2, 'Done')]);
    const updated = Column.create({
      id: makeColumnId(1),
      name: ColumnName.of('In Progress'),
    });
    const result = board.withUpdatedColumn(updated, Timestamp.of(new Date()));
    expect(result.columns[0].name.value).toBe('In Progress');
    expect(result.columns[0]).toBe(updated);
    expect(result.columns[1].name.value).toBe('Done');
  });

  it('throws when no column with the given id exists', () => {
    const board = boardOf([makeColumn(1)]);
    const unknown = Column.create({
      id: makeColumnId(99),
      name: ColumnName.of('Ghost'),
    });
    expect(() => board.withUpdatedColumn(unknown, Timestamp.of(new Date()))).toThrow(
      `Column with id '${unknown.id.toString()}' not found in board`,
    );
  });
});

describe('Board — withName', () => {
  it('returns a new Board with the updated name and same columns', () => {
    const a = makeColumn(1, 'a');
    const board = boardOf([a]);
    const renamed = board.withName(BoardName.of('New Name'), Timestamp.of(new Date()));
    expect(renamed).not.toBe(board);
    expect(renamed.name.value).toBe('New Name');
    expect(renamed.columns.map((c) => c.id.toString())).toEqual([a.id.toString()]);
    // original untouched
    expect(board.name.value).toBe('My Board');
  });
});

describe('Board — withDescription', () => {
  it('sets a new description', () => {
    const board = boardOf([]);
    const result = board.withDescription(BoardDescription.of('now described'), Timestamp.of(new Date()));
    expect(result.description?.value).toBe('now described');
  });

  it('clears the field when passed undefined', () => {
    const board = Board.create({
      id: makeBoardId(0),
      name: BoardName.of('Board'),
      createdAt: Timestamp.of(new Date()),
      description: BoardDescription.of('to be cleared'),
    });
    const result = board.withDescription(undefined, Timestamp.of(new Date()));
    expect(result.description).toBeUndefined();
  });
});
