import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Card } from '../Card';
import { makeCardId, makeColumnId } from '../EntityId';
import { CardName } from '../CardName';
import { CardDescription } from '../CardDescription';
import { CardCategory } from '../CardCategory';
import { DueDate } from '../DueDate';
import { Timestamp } from '../Timestamp';
// value-object constructions below use the static `.of` factories
import { arbCard, arbCardName, arbCardDescription, arbCardCategory, arbDueDate, arbTimestamp } from './generators';

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

describe('Card — property-based', () => {
  // Property 12: Card construction timestamp invariant
  it('Property 12: sets createdAt and lastModifiedAt to the construction timestamp', () => {
    fc.assert(
      fc.property(arbCardName, arbTimestamp, (name, t) => {
        const card = Card.create({
          id: makeCardId(1),
          name,
          createdAt: t,
        });
        expect(card.createdAt).toBe(t);
        expect(card.lastModifiedAt).toBe(t);
      })
    );
  });

  // Property 13: Card immutable update invariant
  it('Property 13: every with* returns a new object with createdAt unchanged and lastModifiedAt === modifiedAt', () => {
    fc.assert(
      fc.property(
        arbCard,
        arbTimestamp,
        arbCardName,
        arbCardDescription,
        arbCardCategory,
        arbDueDate,
        (card, modifiedAt, name, description, category, dueDate) => {
          const updates: Card[] = [
            card.withName(name, modifiedAt),
            card.withDescription(description, modifiedAt),
            card.withCategory(category, modifiedAt),
            card.withDueDate(dueDate, modifiedAt),
          ];

          for (const updated of updates) {
            expect(updated).not.toBe(card);
            expect(updated.createdAt).toBe(card.createdAt);
            expect(updated.lastModifiedAt).toBe(modifiedAt);
          }
        }
      )
    );
  });

  it('Property 13: with* preserves all other fields', () => {
    fc.assert(
      fc.property(arbCard, arbTimestamp, arbCardName, (card, modifiedAt, name) => {
        const updated = card.withName(name, modifiedAt);
        expect(updated.id).toBe(card.id);
        expect(updated.description).toBe(card.description);
        expect(updated.category).toBe(card.category);
        expect(updated.dueDate).toBe(card.dueDate);
        expect(updated.name).toBe(name);
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('Card — construction', () => {
  const baseFields = () => ({
    id: makeCardId(0x0000ab),
    name: CardName.of('Do the thing'),
    createdAt: Timestamp.of(new Date('2026-01-15T10:00:00.000Z')),
  });

  it('constructs with required fields', () => {
    const card = Card.create(baseFields());
    expect(card.name.value).toBe('Do the thing');
    expect(card.description).toBeUndefined();
    expect(card.category).toBeUndefined();
    expect(card.dueDate).toBeUndefined();
  });

  it('rejects a wrong-realm id at compile time (type-level guarantee)', () => {
    const t = Timestamp.of(new Date());
    Card.create({
      // @ts-expect-error a ColumnId cannot be passed where Card.create expects a CardId.
      id: makeColumnId(1),
      name: CardName.of('x'),
      createdAt: t,
    });
  });

  it('retains supplied optional fields', () => {
    const card = Card.create({
      ...baseFields(),
      description: CardDescription.of('details'),
      category: CardCategory.of('bug'),
      dueDate: DueDate.of({ year: 2026, month: 6, day: 1 }),
    });
    expect(card.description?.value).toBe('details');
    expect(card.category?.value).toBe('bug');
    expect(card.dueDate?.month).toBe(6);
  });
});

describe('Card — immutable updates', () => {
  const t0 = Timestamp.of(new Date('2026-01-15T10:00:00.000Z'));
  const t1 = Timestamp.of(new Date('2026-02-20T12:30:00.000Z'));

  const card = () =>
    Card.create({
      id: makeCardId(0x0000ab),
      name: CardName.of('original'),
      createdAt: t0,
      description: CardDescription.of('orig desc'),
      category: CardCategory.of('feature'),
      dueDate: DueDate.of({ year: 2026, month: 3, day: 3 }),
    });

  it('withName replaces name, keeps everything else', () => {
    const c = card();
    const updated = c.withName(CardName.of('renamed'), t1);
    expect(updated).not.toBe(c);
    expect(updated.name.value).toBe('renamed');
    expect(updated.createdAt).toBe(t0);
    expect(updated.lastModifiedAt).toBe(t1);
    expect(updated.description).toBe(c.description);
    expect(updated.category).toBe(c.category);
    expect(updated.dueDate).toBe(c.dueDate);
    // original untouched
    expect(c.name.value).toBe('original');
    expect(c.lastModifiedAt).toBe(t0);
  });

  it('withDescription(undefined) clears the field', () => {
    const c = card();
    const updated = c.withDescription(undefined, t1);
    expect(updated.description).toBeUndefined();
    expect(updated.lastModifiedAt).toBe(t1);
    expect(updated.name).toBe(c.name);
  });

  it('withCategory(undefined) clears the field', () => {
    const c = card();
    const updated = c.withCategory(undefined, t1);
    expect(updated.category).toBeUndefined();
    expect(updated.lastModifiedAt).toBe(t1);
  });

  it('withDueDate(undefined) clears the field', () => {
    const c = card();
    const updated = c.withDueDate(undefined, t1);
    expect(updated.dueDate).toBeUndefined();
    expect(updated.lastModifiedAt).toBe(t1);
  });

  it('withCategory sets a new category and preserves other fields', () => {
    const c = card();
    const updated = c.withCategory(CardCategory.of('chore'), t1);
    expect(updated.category?.value).toBe('chore');
    expect(updated.name).toBe(c.name);
    expect(updated.description).toBe(c.description);
    expect(updated.dueDate).toBe(c.dueDate);
  });

  it('withDueDate sets a new due date and preserves other fields', () => {
    const c = card();
    const updated = c.withDueDate(DueDate.of({ year: 2027, month: 12, day: 31 }), t1);
    expect(updated.dueDate?.year).toBe(2027);
    expect(updated.name).toBe(c.name);
    expect(updated.description).toBe(c.description);
    expect(updated.category).toBe(c.category);
  });
});
