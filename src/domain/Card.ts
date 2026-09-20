import type { CardId } from './EntityId';
import type { CardName } from './CardName';
import type { CardDescription } from './CardDescription';
import type { CardCategory } from './CardCategory';
import type { DueDate } from './DueDate';
import type { Timestamp } from './Timestamp';

/**
 * Fields accepted by {@link Card.create}.
 *
 * `id` is a {@link CardId} — the type system guarantees the realm is `'card'`,
 * so no runtime realm check is needed. `createdAt` is the caller-supplied
 * creation timestamp; on creation both `createdAt` and `lastModifiedAt` are set
 * to this value (Requirement 7.3). No separate `lastModifiedAt` is accepted
 * here — the create-time invariant is enforced by the factory.
 */
export interface CardCreateFields {
  id: CardId;
  name: CardName;
  createdAt: Timestamp;
  description?: CardDescription;
  category?: CardCategory;
  dueDate?: DueDate;
}

/**
 * Fields accepted by {@link Card.restore}.
 *
 * Sets every timestamp verbatim, allowing a distinct `lastModifiedAt` to be
 * supplied alongside a preserved `createdAt`. Used by the immutable `withX`
 * updaters (and by {@link copyCard} indirectly) to build a `Card` whose
 * `lastModifiedAt` differs from its `createdAt`.
 */
export interface CardRestoreFields {
  id: CardId;
  name: CardName;
  createdAt: Timestamp;
  lastModifiedAt: Timestamp;
  description?: CardDescription;
  category?: CardCategory;
  dueDate?: DueDate;
}

/**
 * A card entity.
 *
 * Immutable by design: every field is `readonly` and every update returns a
 * new `Card` instance. Construction goes through the static factories
 * {@link Card.create} (create-time invariant) and {@link Card.restore}
 * (verbatim timestamps); the constructor is private. The `createdAt` timestamp
 * is never modifiable — no method exposes a way to change it (Requirement 7.5,
 * compile-time prevention).
 *
 * Invariants:
 * - `id` is a {@link CardId} (realm `'card'` guaranteed by the type system).
 * - Via {@link Card.create}, `createdAt` and `lastModifiedAt` are both set to
 *   the provided `createdAt` (Requirement 7.3).
 */
export class Card {
  readonly id: CardId;
  readonly name: CardName;
  readonly createdAt: Timestamp;
  readonly lastModifiedAt: Timestamp;
  readonly description: CardDescription | undefined;
  readonly category: CardCategory | undefined;
  readonly dueDate: DueDate | undefined;

  private constructor(fields: CardRestoreFields) {
    // No runtime realm check: `fields.id` is a CardId, so the realm is
    // guaranteed to be 'card' at compile time.
    this.id = fields.id;
    this.name = fields.name;
    this.createdAt = fields.createdAt;
    this.lastModifiedAt = fields.lastModifiedAt;
    this.description = fields.description;
    this.category = fields.category;
    this.dueDate = fields.dueDate;
  }

  /**
   * Creates a new `Card`. Both `createdAt` and `lastModifiedAt` are set to
   * `fields.createdAt`, enforcing the create-time invariant (Requirement 7.3).
   */
  static create(fields: CardCreateFields): Card {
    return new Card({
      id: fields.id,
      name: fields.name,
      createdAt: fields.createdAt,
      lastModifiedAt: fields.createdAt,
      ...(fields.description !== undefined
        ? { description: fields.description }
        : {}),
      ...(fields.category !== undefined ? { category: fields.category } : {}),
      ...(fields.dueDate !== undefined ? { dueDate: fields.dueDate } : {}),
    });
  }

  /**
   * Rebuilds a `Card` from verbatim fields, setting `createdAt` and
   * `lastModifiedAt` independently. Used to produce updated copies whose
   * `lastModifiedAt` differs from a preserved `createdAt`.
   */
  private static restore(fields: CardRestoreFields): Card {
    return new Card(fields);
  }

  /**
   * Identity-based equality: two cards are equal when they share the same id.
   */
  equals(other: Card): boolean {
    return this.id.equals(other.id);
  }

  /**
   * Returns a new `Card` with the given name and `lastModifiedAt` set to
   * `modifiedAt`; `createdAt` and all other fields are preserved.
   */
  withName(name: CardName, modifiedAt: Timestamp): Card {
    return Card.restore({
      id: this.id,
      name,
      createdAt: this.createdAt,
      lastModifiedAt: modifiedAt,
      ...(this.description !== undefined
        ? { description: this.description }
        : {}),
      ...(this.category !== undefined ? { category: this.category } : {}),
      ...(this.dueDate !== undefined ? { dueDate: this.dueDate } : {}),
    });
  }

  /**
   * Returns a new `Card` with the given description (passing `undefined`
   * clears the field) and `lastModifiedAt` set to `modifiedAt`; `createdAt`
   * and all other fields are preserved.
   */
  withDescription(
    description: CardDescription | undefined,
    modifiedAt: Timestamp,
  ): Card {
    return Card.restore({
      id: this.id,
      name: this.name,
      createdAt: this.createdAt,
      lastModifiedAt: modifiedAt,
      ...(description !== undefined ? { description } : {}),
      ...(this.category !== undefined ? { category: this.category } : {}),
      ...(this.dueDate !== undefined ? { dueDate: this.dueDate } : {}),
    });
  }

  /**
   * Returns a new `Card` with the given category (passing `undefined` clears
   * the field) and `lastModifiedAt` set to `modifiedAt`; `createdAt` and all
   * other fields are preserved.
   */
  withCategory(category: CardCategory | undefined, modifiedAt: Timestamp): Card {
    return Card.restore({
      id: this.id,
      name: this.name,
      createdAt: this.createdAt,
      lastModifiedAt: modifiedAt,
      ...(this.description !== undefined
        ? { description: this.description }
        : {}),
      ...(category !== undefined ? { category } : {}),
      ...(this.dueDate !== undefined ? { dueDate: this.dueDate } : {}),
    });
  }

  /**
   * Returns a new `Card` with the given due date (passing `undefined` clears
   * the field) and `lastModifiedAt` set to `modifiedAt`; `createdAt` and all
   * other fields are preserved.
   */
  withDueDate(dueDate: DueDate | undefined, modifiedAt: Timestamp): Card {
    return Card.restore({
      id: this.id,
      name: this.name,
      createdAt: this.createdAt,
      lastModifiedAt: modifiedAt,
      ...(this.description !== undefined
        ? { description: this.description }
        : {}),
      ...(this.category !== undefined ? { category: this.category } : {}),
      ...(dueDate !== undefined ? { dueDate } : {}),
    });
  }
}
