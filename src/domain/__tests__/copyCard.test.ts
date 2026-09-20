import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { copyCard } from '../copyCard';
import { Card } from '../Card';
import { makeCardId, makeColumnId } from '../EntityId';
import { CardName } from '../CardName';
import { CardDescription } from '../CardDescription';
import { CardCategory } from '../CardCategory';
import { DueDate } from '../DueDate';
import { Timestamp } from '../Timestamp';
import { arbCard, arbCardId, arbTimestamp } from './generators';

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

describe('copyCard — property-based', () => {
  // Feature: domain-model, Property 20: copyCard produces a correct copy — For any source Card, any newId with realm 'card', and any pasteAt Date, copyCard(source, newId, pasteAt) returns a Card where id.equals(newId) is true, createdAt === pasteAt, lastModifiedAt === pasteAt, name/description/category/dueDate equal the source's, and any field absent on source is absent (undefined) on the copy.
  it('Property 20: produces a correct copy with new id, paste timestamps, and preserved data fields', () => {
    fc.assert(
      fc.property(arbCard, arbCardId, arbTimestamp, (source, newId, pasteAt) => {
        const result = copyCard(source, newId, pasteAt);

        // New identity and paste timestamps
        expect(result.id.equals(newId)).toBe(true);
        expect(result.createdAt).toBe(pasteAt);
        expect(result.lastModifiedAt).toBe(pasteAt);

        // Data fields copied verbatim (by reference — value objects are immutable)
        expect(result.name).toBe(source.name);
        expect(result.description).toBe(source.description);
        expect(result.category).toBe(source.category);
        expect(result.dueDate).toBe(source.dueDate);

        // Absent-on-source fields remain absent on the copy
        if (source.description === undefined) {
          expect(result.description).toBeUndefined();
        }
        if (source.category === undefined) {
          expect(result.category).toBeUndefined();
        }
        if (source.dueDate === undefined) {
          expect(result.dueDate).toBeUndefined();
        }

        // Distinct object
        expect(result).not.toBe(source);
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('copyCard — realm safety (compile-time)', () => {
  const source = () =>
    Card.create({
      id: makeCardId(1),
      name: CardName.of('source'),
      createdAt: Timestamp.of(new Date('2026-01-01T00:00:00.000Z')),
    });

  const pasteAt = Timestamp.of(new Date('2026-02-02T00:00:00.000Z'));

  it('rejects a non-card newId at compile time (type-level guarantee)', () => {
    // @ts-expect-error copyCard requires a CardId; a ColumnId is a type error.
    copyCard(source(), makeColumnId(5), pasteAt);
  });
});

describe('copyCard — copy semantics', () => {
  const t0 = Timestamp.of(new Date('2026-01-01T00:00:00.000Z'));
  const pasteAt = Timestamp.of(new Date('2026-03-03T12:00:00.000Z'));

  it('returns a distinct object from the source', () => {
    const source = Card.create({
      id: makeCardId(1),
      name: CardName.of('source'),
      createdAt: t0,
    });
    const result = copyCard(source, makeCardId(2), pasteAt);
    expect(result).not.toBe(source);
  });

  it('omits optional fields that are absent on the source', () => {
    const source = Card.create({
      id: makeCardId(1),
      name: CardName.of('minimal'),
      createdAt: t0,
    });
    const result = copyCard(source, makeCardId(2), pasteAt);

    expect(result.description).toBeUndefined();
    expect(result.category).toBeUndefined();
    expect(result.dueDate).toBeUndefined();
    // sanity: new identity + paste timestamps
    expect(result.id.equals(makeCardId(2))).toBe(true);
    expect(result.createdAt).toBe(pasteAt);
    expect(result.lastModifiedAt).toBe(pasteAt);
  });

  it('copies all optional fields through when present on the source', () => {
    const description = CardDescription.of('full details');
    const category = CardCategory.of('bug');
    const dueDate = DueDate.of({ year: 2026, month: 6, day: 15 });
    const source = Card.create({
      id: makeCardId(1),
      name: CardName.of('fully populated'),
      createdAt: t0,
      description,
      category,
      dueDate,
    });

    const result = copyCard(source, makeCardId(2), pasteAt);

    expect(result.name).toBe(source.name);
    expect(result.description).toBe(description);
    expect(result.category).toBe(category);
    expect(result.dueDate).toBe(dueDate);
    expect(result.createdAt).toBe(pasteAt);
    expect(result.lastModifiedAt).toBe(pasteAt);
    expect(result.id.equals(makeCardId(2))).toBe(true);
  });
});
