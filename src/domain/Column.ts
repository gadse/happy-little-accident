import type { CardId, ColumnId } from './EntityId';
import type { ColumnName } from './ColumnName';
import type { Card } from './Card';

/**
 * Fields accepted by {@link Column.create}.
 *
 * `id` is a {@link ColumnId} — the type system guarantees the realm is
 * `'column'`. `cards` is optional and defaults to an empty array when omitted
 * (Requirement 8.2).
 */
export interface ColumnCreateFields {
  id: ColumnId;
  name: ColumnName;
  cards?: Card[];
}

/**
 * A column entity — an ordered collection of {@link Card}s.
 *
 * Immutable by design: every field is `readonly` and every update returns a
 * new `Column` instance; the original is never mutated. Construction goes
 * through the static factory {@link Column.create}; the constructor is
 * private.
 *
 * Invariants:
 * - `id` is a {@link ColumnId} (realm `'column'` guaranteed by the type
 *   system).
 * - `cards` defaults to `[]` when omitted (Requirement 8.2).
 * - `cards` contains no two entries sharing a {@link CardId} (compared via
 *   `equals`). Enforced in the constructor, so every construction path
 *   (including the `withX` rebuilds) rejects duplicates.
 */
export class Column {
  readonly id: ColumnId;
  readonly name: ColumnName;
  readonly cards: readonly Card[];

  private constructor(fields: ColumnCreateFields) {
    // No runtime realm check: `fields.id` is a ColumnId, so the realm is
    // guaranteed to be 'column' at compile time.
    const cards = fields.cards ?? [];
    Column.assertNoDuplicateCardIds(cards);
    this.id = fields.id;
    this.name = fields.name;
    this.cards = cards;
  }

  /**
   * Throws if `cards` contains two entries sharing a {@link CardId} (compared
   * via `equals`). The single chokepoint for the no-duplicate-ids invariant;
   * every construction path routes through the constructor, which calls this.
   */
  private static assertNoDuplicateCardIds(cards: readonly Card[]): void {
    const seen: CardId[] = [];
    for (const card of cards) {
      if (seen.some((id) => id.equals(card.id))) {
        throw new Error(
          `Column cannot contain duplicate card ids: '${card.id.toString()}'`,
        );
      }
      seen.push(card.id);
    }
  }

  /**
   * Creates a new `Column`. `cards` defaults to `[]` when omitted
   * (Requirement 8.2).
   */
  static create(fields: ColumnCreateFields): Column {
    return new Column(fields);
  }

  /**
   * Identity-based equality: two columns are equal when they share the same
   * id.
   */
  equals(other: Column): boolean {
    return this.id.equals(other.id);
  }

  /**
   * Returns a new `Column` with `card` inserted at the given zero-based
   * `index`; all cards at or after `index` shift one position higher. The
   * original `Column` is unchanged.
   *
   * Throws if `index < 0 || index > cards.length`, or if a card sharing
   * `card`'s id is already present.
   */
  withCardAt(index: number, card: Card): Column {
    const n = this.cards.length;
    if (index < 0 || index > n) {
      throw new Error(`Card index ${index} out of range [0, ${n}]`);
    }
    if (this.cards.some((c) => c.id.equals(card.id))) {
      throw new Error(
        `Column cannot contain duplicate card ids: '${card.id.toString()}'`,
      );
    }
    const cards = [
      ...this.cards.slice(0, index),
      card,
      ...this.cards.slice(index),
    ];
    return Column.create({ id: this.id, name: this.name, cards });
  }

  /**
   * Returns a new `Column` with the card matching `cardId` (compared via
   * `equals`) removed; the relative order of the remaining cards is preserved.
   * The original `Column` is unchanged.
   *
   * Throws if no card with that id exists.
   */
  withoutCard(cardId: CardId): Column {
    const exists = this.cards.some((c) => c.id.equals(cardId));
    if (!exists) {
      throw new Error(
        `Card with id '${cardId.toString()}' not found in column`,
      );
    }
    const cards = this.cards.filter((c) => !c.id.equals(cardId));
    return Column.create({ id: this.id, name: this.name, cards });
  }

  /**
   * Returns a new `Column` with cards arranged in the order given by
   * `newOrder`. The original `Column` is unchanged.
   *
   * `newOrder` must be a permutation of the current cards: it must have the
   * same count AND the same set of card ids (compared via `equals`). Throws
   * otherwise.
   */
  withCardsReordered(newOrder: Card[]): Column {
    if (newOrder.length !== this.cards.length) {
      throw new Error(
        'Reorder array must be a permutation of the current cards',
      );
    }
    const isPermutation = this.cards.every((current) =>
      newOrder.some((candidate) => candidate.id.equals(current.id)),
    );
    if (!isPermutation) {
      throw new Error(
        'Reorder array must be a permutation of the current cards',
      );
    }
    // A true permutation of distinct-id cards is itself distinct-id, but
    // assert explicitly so a repeated entry can never slip through.
    Column.assertNoDuplicateCardIds(newOrder);
    return Column.create({ id: this.id, name: this.name, cards: [...newOrder] });
  }

  /**
   * Returns a new `Column` with the given name; the cards are preserved.
   */
  withName(name: ColumnName): Column {
    return Column.create({ id: this.id, name, cards: [...this.cards] });
  }
}
