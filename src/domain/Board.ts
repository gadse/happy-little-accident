import type { BoardId, ColumnId } from './EntityId';
import type { BoardName } from './BoardName';
import type { BoardDescription } from './BoardDescription';
import type { Column } from './Column';
import type { Timestamp } from './Timestamp';

/**
 * Fields accepted by {@link Board.create}.
 *
 * `id` is a {@link BoardId} — the type system guarantees the realm is
 * `'board'`. `createdAt` is the caller-supplied creation timestamp; on creation
 * both `createdAt` and `lastModifiedAt` are set to this value
 * (Requirement 9.2). `columns` is optional and defaults to an empty array when
 * omitted.
 */
export interface BoardCreateFields {
  id: BoardId;
  name: BoardName;
  createdAt: Timestamp;
  description?: BoardDescription;
  columns?: Column[];
}

/**
 * Fields accepted by the private `Board` constructor: like
 * {@link BoardCreateFields} but with an explicit `lastModifiedAt`, so internal
 * rebuilds can set it independently of `createdAt` without post-construction
 * mutation.
 */
interface BoardConstructFields {
  id: BoardId;
  name: BoardName;
  createdAt: Timestamp;
  lastModifiedAt: Timestamp;
  description?: BoardDescription;
  columns?: readonly Column[];
}

/**
 * A board entity — an ordered collection of {@link Column}s.
 *
 * Immutable by design: every field is `readonly` and every update returns a
 * new `Board` instance; the original is never mutated. Construction goes
 * through the static factory {@link Board.create}; the constructor is private.
 * The `createdAt` timestamp is never modifiable — no method exposes a way to
 * change it (Requirement 9.9, compile-time prevention).
 *
 * Invariants:
 * - `id` is a {@link BoardId} (realm `'board'` guaranteed by the type system).
 * - Via {@link Board.create}, `createdAt` and `lastModifiedAt` are both set to
 *   the provided `createdAt` (Requirement 9.2).
 * - `columns` defaults to `[]` when omitted.
 */
export class Board {
  readonly id: BoardId;
  readonly name: BoardName;
  readonly createdAt: Timestamp;
  readonly lastModifiedAt: Timestamp;
  readonly columns: readonly Column[];
  readonly description: BoardDescription | undefined;

  private constructor(fields: BoardConstructFields) {
    // No runtime realm check: `fields.id` is a BoardId, so the realm is
    // guaranteed to be 'board' at compile time.
    this.id = fields.id;
    this.name = fields.name;
    this.createdAt = fields.createdAt;
    this.lastModifiedAt = fields.lastModifiedAt;
    this.columns = fields.columns ?? [];
    this.description = fields.description;
  }

  /**
   * Creates a new `Board`. Both `createdAt` and `lastModifiedAt` are set to
   * `fields.createdAt`, enforcing the create-time invariant (Requirement 9.2).
   * `columns` defaults to `[]` when omitted.
   */
  static create(fields: BoardCreateFields): Board {
    return new Board({
      id: fields.id,
      name: fields.name,
      createdAt: fields.createdAt,
      lastModifiedAt: fields.createdAt,
      ...(fields.columns !== undefined ? { columns: fields.columns } : {}),
      ...(fields.description !== undefined
        ? { description: fields.description }
        : {}),
    });
  }

  /**
   * Identity-based equality: two boards are equal when they share the same id.
   */
  equals(other: Board): boolean {
    return this.id.equals(other.id);
  }

  /**
   * Returns a new `Board` with `column` inserted at the given zero-based
   * `index`; all columns at or after `index` shift one position higher.
   * `lastModifiedAt` is set to `modifiedAt`; `createdAt` and all other fields
   * are preserved. The original `Board` is unchanged.
   *
   * Throws if `index < 0 || index > columns.length`.
   */
  withColumnAt(index: number, column: Column, modifiedAt: Timestamp): Board {
    const n = this.columns.length;
    if (index < 0 || index > n) {
      throw new Error(`Column index ${index} out of range [0, ${n}]`);
    }
    const columns = [
      ...this.columns.slice(0, index),
      column,
      ...this.columns.slice(index),
    ];
    return this.rebuild({ columns }, modifiedAt);
  }

  /**
   * Returns a new `Board` with the column matching `columnId` (compared via
   * `equals`) removed; the relative order of the remaining columns is
   * preserved. `lastModifiedAt` is set to `modifiedAt`; `createdAt` and all
   * other fields are preserved. The original `Board` is unchanged.
   *
   * Throws if no column with that id exists.
   */
  withoutColumn(columnId: ColumnId, modifiedAt: Timestamp): Board {
    const exists = this.columns.some((c) => c.id.equals(columnId));
    if (!exists) {
      throw new Error(
        `Column with id '${columnId.toString()}' not found in board`,
      );
    }
    const columns = this.columns.filter((c) => !c.id.equals(columnId));
    return this.rebuild({ columns }, modifiedAt);
  }

  /**
   * Returns a new `Board` in which the column sharing `column`'s id (compared
   * via `equals`) is replaced with the provided `column`
   * instance; the relative order of columns is preserved. `lastModifiedAt` is
   * set to `modifiedAt`; `createdAt` and all other fields are preserved. The
   * original `Board` is unchanged.
   *
   * Throws if no column with that id exists.
   */
  withUpdatedColumn(column: Column, modifiedAt: Timestamp): Board {
    const exists = this.columns.some((c) => c.id.equals(column.id));
    if (!exists) {
      throw new Error(
        `Column with id '${column.id.toString()}' not found in board`,
      );
    }
    const columns = this.columns.map((c) =>
      c.id.equals(column.id) ? column : c,
    );
    return this.rebuild({ columns }, modifiedAt);
  }

  /**
   * Returns a new `Board` with the given name and `lastModifiedAt` set to
   * `modifiedAt`; `createdAt`, columns, and description are preserved.
   */
  withName(name: BoardName, modifiedAt: Timestamp): Board {
    return this.rebuild({ name }, modifiedAt);
  }

  /**
   * Returns a new `Board` with the given description (passing `undefined`
   * clears the field) and `lastModifiedAt` set to `modifiedAt`; `createdAt`,
   * name, and columns are preserved.
   */
  withDescription(
    description: BoardDescription | undefined,
    modifiedAt: Timestamp,
  ): Board {
    return this.rebuild({ hasDescription: true, description }, modifiedAt);
  }

  /**
   * Internal helper: builds a new `Board` from this one, applying the given
   * overrides, and sets `lastModifiedAt` to `modifiedAt`. `createdAt` is
   * always preserved from the original — no code path can change it. The
   * private constructor accepts `lastModifiedAt` directly, so no
   * post-construction mutation is needed.
   *
   * The `description` override is only applied when `hasDescription` is
   * `true`, which lets `withDescription(undefined, …)` clear the field while
   * the structural updates (columns, name) leave the existing description
   * untouched.
   */
  private rebuild(
    overrides: {
      name?: BoardName;
      columns?: readonly Column[];
      hasDescription?: boolean;
      description?: BoardDescription | undefined;
    },
    modifiedAt: Timestamp,
  ): Board {
    const nextDescription = overrides.hasDescription
      ? overrides.description
      : this.description;
    const nextColumns = overrides.columns ?? this.columns;
    return new Board({
      id: this.id,
      name: overrides.name ?? this.name,
      createdAt: this.createdAt,
      lastModifiedAt: modifiedAt,
      columns: [...nextColumns],
      ...(nextDescription !== undefined
        ? { description: nextDescription }
        : {}),
    });
  }
}
