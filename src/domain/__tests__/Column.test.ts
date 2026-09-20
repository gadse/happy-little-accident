import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Column } from '../Column';
import { Card } from '../Card';
import { makeCardId, makeColumnId } from '../EntityId';
import { CardName } from '../CardName';
import { ColumnName } from '../ColumnName';
import { Timestamp } from '../Timestamp';
import { arbColumn, arbCardName } from './generators';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a simple Card with a deterministic id from a counter. Card ids
 * produced by `arbColumn` come from counters in [0, 0xFFFFFF]; using a counter
 * at the very top of that range keeps collisions astronomically unlikely for
 * the fresh-card insertion property.
 */
function makeCard(counter: number, name = 'fresh card'): Card {
  const t = Timestamp.of(new Date('2026-01-01T00:00:00.000Z'));
  return Card.create({
    id: makeCardId(counter),
    name: CardName.of(name),
    createdAt: t,
  });
}

function columnOf(cards: Card[]): Column {
  return Column.create({
    id: makeColumnId(1),
    name: ColumnName.of('To Do'),
    cards,
  });
}

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

describe('Column — property-based', () => {
  // Feature: domain-model, Property 14: Column card insertion invariant — For any Column with n cards and any valid index i in [0, n], withCardAt(i, card) returns a Column where cards[i].id.equals(card.id) is true and cards.length === n + 1. For any index i < 0 or i > n, withCardAt throws an Error.
  it('Property 14: valid index inserts at the correct position and grows by one', () => {
    fc.assert(
      fc.property(arbColumn, arbCardName, fc.integer({ min: 0, max: 0xffffff }), (column, name, counter) => {
        const n = column.cards.length;
        // Ensure the fresh card's id is not already present; regenerate a
        // guaranteed-unique id by scanning for a free counter if it collides.
        let c = counter;
        const used = new Set(column.cards.map((card) => card.id.toString()));
        while (used.has(makeCardId(c).toString())) {
          c = (c + 1) % (0xffffff + 1);
        }
        const card = Card.create({
          id: makeCardId(c),
          name,
          createdAt: Timestamp.of(0),
        });

        for (let i = 0; i <= n; i++) {
          const result = column.withCardAt(i, card);
          expect(result.cards.length).toBe(n + 1);
          expect(result.cards[i].id.equals(card.id)).toBe(true);
        }
      }),
    );
  });

  it('Property 14: out-of-range index throws', () => {
    fc.assert(
      fc.property(arbColumn, (column) => {
        const n = column.cards.length;
        const card = makeCard(0);
        expect(() => column.withCardAt(-1, card)).toThrow();
        expect(() => column.withCardAt(n + 1, card)).toThrow();
      }),
    );
  });

  // Feature: domain-model, Property 15: Column card removal invariant — For any Column containing a card with id cid, withoutCard(cid) returns a Column that contains no card with id cid and has exactly n-1 cards; relative order of remaining cards is preserved.
  it('Property 15: removing an existing card drops it, shrinks by one, and preserves order', () => {
    fc.assert(
      fc.property(
        arbColumn.filter((c) => c.cards.length > 0),
        fc.integer({ min: 0, max: 1_000_000 }),
        (column, pick) => {
          const n = column.cards.length;
          const target = column.cards[pick % n];
          const result = column.withoutCard(target.id);

          expect(result.cards.length).toBe(n - 1);
          expect(result.cards.some((card) => card.id.equals(target.id))).toBe(false);

          // Relative order of remaining cards preserved: filtering the original
          // by "not the removed id" must equal the result order (compared by id).
          const expected = column.cards
            .filter((card) => !card.id.equals(target.id))
            .map((card) => card.id.toString());
          const actual = result.cards.map((card) => card.id.toString());
          expect(actual).toEqual(expected);
        },
      ),
    );
  });

  // Feature: domain-model, Property 16: Column card reorder is a permutation — For any Column with cards and any permutation p of those exact card instances, withCardsReordered(p) returns a Column with cards equal to p (compare by id order). For any array that is not a permutation, withCardsReordered throws an Error.
  it('Property 16: a shuffled permutation of the exact cards reorders to that order', () => {
    fc.assert(
      fc.property(
        arbColumn.chain((column) =>
          fc.tuple(fc.constant(column), fc.shuffledSubarray(column.cards as Card[], {
            minLength: column.cards.length,
            maxLength: column.cards.length,
          })),
        ),
        ([column, shuffled]) => {
          const result = column.withCardsReordered(shuffled as Card[]);
          const resultIds = result.cards.map((c) => c.id.toString());
          const expectedIds = (shuffled as Card[]).map((c) => c.id.toString());
          expect(resultIds).toEqual(expectedIds);
          expect(result.cards.length).toBe(column.cards.length);
        },
      ),
    );
  });

  it('Property 16: a non-permutation throws (wrong count or foreign member)', () => {
    fc.assert(
      fc.property(
        arbColumn.filter((c) => c.cards.length > 0),
        (column) => {
          // Different count: drop the first card.
          const wrongCount = column.cards.slice(1) as Card[];
          expect(() => column.withCardsReordered(wrongCount)).toThrow();

          // Same count but a foreign member replaces one existing card.
          const usedCounters = new Set(column.cards.map((c) => c.id.hex));
          let foreignCounter = 0xffffff;
          while (usedCounters.has(makeCardId(foreignCounter).hex)) {
            foreignCounter -= 1;
          }
          const foreign = makeCard(foreignCounter, 'intruder');
          const withForeign = [foreign, ...column.cards.slice(1)] as Card[];
          expect(() => column.withCardsReordered(withForeign)).toThrow();
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('Column — construction', () => {
  it('defaults cards to an empty array when omitted', () => {
    const column = Column.create({
      id: makeColumnId(0),
      name: ColumnName.of('Backlog'),
    });
    expect(column.cards).toEqual([]);
  });

  it('rejects a wrong-realm id at compile time (type-level guarantee)', () => {
    Column.create({
      // @ts-expect-error a CardId cannot be passed where Column.create expects a ColumnId.
      id: makeCardId(1),
      name: ColumnName.of('Backlog'),
    });
  });
});

describe('Column — withCardAt', () => {
  it('adds a card to an empty column at index 0', () => {
    const column = columnOf([]);
    const card = makeCard(10);
    const result = column.withCardAt(0, card);
    expect(result.cards.length).toBe(1);
    expect(result.cards[0].id.equals(card.id)).toBe(true);
  });

  it('inserts at the front (index 0) of a non-empty column', () => {
    const a = makeCard(1, 'a');
    const b = makeCard(2, 'b');
    const column = columnOf([a, b]);
    const fresh = makeCard(3, 'fresh');
    const result = column.withCardAt(0, fresh);
    expect(result.cards.map((c) => c.id.toString())).toEqual([
      fresh.id.toString(),
      a.id.toString(),
      b.id.toString(),
    ]);
  });

  it('inserts at the end (index === length)', () => {
    const a = makeCard(1, 'a');
    const b = makeCard(2, 'b');
    const column = columnOf([a, b]);
    const fresh = makeCard(3, 'fresh');
    const result = column.withCardAt(2, fresh);
    expect(result.cards.map((c) => c.id.toString())).toEqual([
      a.id.toString(),
      b.id.toString(),
      fresh.id.toString(),
    ]);
  });

  it('throws for index -1 with the range message', () => {
    const column = columnOf([makeCard(1)]);
    expect(() => column.withCardAt(-1, makeCard(2))).toThrow(
      'Card index -1 out of range [0, 1]',
    );
  });

  it('throws for index length + 1 with the range message', () => {
    const column = columnOf([makeCard(1)]);
    expect(() => column.withCardAt(2, makeCard(2))).toThrow(
      'Card index 2 out of range [0, 1]',
    );
  });
});

describe('Column — withoutCard', () => {
  it('removes the only card from a single-card column', () => {
    const only = makeCard(1);
    const column = columnOf([only]);
    const result = column.withoutCard(only.id);
    expect(result.cards).toEqual([]);
  });

  it('throws when the id is not present', () => {
    const column = columnOf([makeCard(1)]);
    const missing = makeCardId(99);
    expect(() => column.withoutCard(missing)).toThrow(
      `Card with id '${missing.toString()}' not found in column`,
    );
  });
});

describe('Column — withCardsReordered', () => {
  it('reorders a column of two cards (swap)', () => {
    const a = makeCard(1, 'a');
    const b = makeCard(2, 'b');
    const column = columnOf([a, b]);
    const result = column.withCardsReordered([b, a]);
    expect(result.cards.map((c) => c.id.toString())).toEqual([
      b.id.toString(),
      a.id.toString(),
    ]);
  });

  it('throws for a non-permutation with the wrong count', () => {
    const a = makeCard(1, 'a');
    const b = makeCard(2, 'b');
    const column = columnOf([a, b]);
    expect(() => column.withCardsReordered([a])).toThrow(
      'Reorder array must be a permutation of the current cards',
    );
  });

  it('throws for a same-count array containing a foreign card id', () => {
    const a = makeCard(1, 'a');
    const b = makeCard(2, 'b');
    const column = columnOf([a, b]);
    const foreign = makeCard(3, 'foreign');
    expect(() => column.withCardsReordered([a, foreign])).toThrow(
      'Reorder array must be a permutation of the current cards',
    );
  });
});

describe('Column — withName', () => {
  it('returns a new Column with the updated name and same cards', () => {
    const a = makeCard(1, 'a');
    const b = makeCard(2, 'b');
    const column = columnOf([a, b]);
    const renamed = column.withName(ColumnName.of('In Progress'));
    expect(renamed).not.toBe(column);
    expect(renamed.name.value).toBe('In Progress');
    expect(renamed.cards.map((c) => c.id.toString())).toEqual([
      a.id.toString(),
      b.id.toString(),
    ]);
    // original untouched
    expect(column.name.value).toBe('To Do');
  });
});

describe('Column — immutability', () => {
  it('with* methods return new references and leave the original cards unchanged', () => {
    const a = makeCard(1, 'a');
    const b = makeCard(2, 'b');
    const column = columnOf([a, b]);
    const originalIds = column.cards.map((c) => c.id.toString());

    const inserted = column.withCardAt(1, makeCard(3, 'c'));
    const removed = column.withoutCard(a.id);
    const reordered = column.withCardsReordered([b, a]);
    const renamed = column.withName(ColumnName.of('X'));

    for (const result of [inserted, removed, reordered, renamed]) {
      expect(result).not.toBe(column);
    }

    // original column cards are unchanged
    expect(column.cards.map((c) => c.id.toString())).toEqual(originalIds);
    expect(column.cards.length).toBe(2);
  });
});
