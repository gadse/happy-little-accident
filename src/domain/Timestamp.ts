/**
 * A single instant in time — an immutable value object.
 *
 * Stores the instant as a private `number` (epoch milliseconds), so there is
 * no mutable `Date` to leak. This closes the shared-mutable-state hole that
 * plain `Date` timestamps left open: a `Date` is mutable and, when shared by
 * reference between a card and its copy (or between an entity and its
 * `with*`-derived successor), could be mutated through one holder and corrupt
 * the other. A `Timestamp` makes that sharing safe by construction
 * (Requirement 12.1).
 *
 * Invariants (enforced at construction):
 * - Constructed via {@link Timestamp.of} from either a `Date` or epoch
 *   milliseconds.
 * - When constructed from a `Date`, only `.getTime()` is read; the caller's
 *   `Date` reference is never retained.
 * - Throws for an invalid `Date` (`NaN` time) or a non-finite number
 *   (Requirement 12.2).
 */
export class Timestamp {
  readonly #epochMillis: number;

  private constructor(epochMillis: number) {
    this.#epochMillis = epochMillis;
  }

  /**
   * Constructs a `Timestamp` from a `Date` (its `.getTime()` is read and the
   * reference discarded) or from epoch milliseconds.
   *
   * Throws if `input` is an invalid `Date` (`NaN` time) or a non-finite number.
   */
  static of(input: Date | number): Timestamp {
    const epochMillis = input instanceof Date ? input.getTime() : input;
    if (typeof epochMillis !== 'number' || !Number.isFinite(epochMillis)) {
      throw new Error(
        'Invalid Timestamp: expected a valid Date or finite epoch millis',
      );
    }
    return new Timestamp(epochMillis);
  }

  /** The instant as epoch milliseconds. */
  get epochMillis(): number {
    return this.#epochMillis;
  }

  /**
   * Returns a fresh `Date` representing this instant on every call, so a holder
   * cannot mutate the `Timestamp`'s instant through the returned `Date`.
   */
  toDate(): Date {
    return new Date(this.#epochMillis);
  }

  /**
   * Value-based equality: two timestamps are equal if and only if they
   * represent the same instant (Requirement 12.3).
   */
  equals(other: Timestamp): boolean {
    return this.#epochMillis === other.#epochMillis;
  }
}
