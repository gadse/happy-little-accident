const MAX_CODE_POINTS = 10000;

/**
 * A board's long-form description.
 *
 * Invariants (enforced at construction):
 * - Must not be `null` or `undefined` (runtime check).
 * - At most 10,000 Unicode code points; the empty string is valid.
 *
 * The value is stored verbatim — no trimming or normalization is applied.
 */
export class BoardDescription {
  readonly #value: string;

  private constructor(value: string) {
    if (value === null || value === undefined) {
      throw new Error('BoardDescription value must not be null or undefined');
    }
    const length = [...value].length;
    if (length > MAX_CODE_POINTS) {
      throw new Error(
        `BoardDescription must be at most ${MAX_CODE_POINTS} code points, got ${length}`
      );
    }
    this.#value = value;
  }

  static of(value: string): BoardDescription {
    return new BoardDescription(value);
  }

  get value(): string {
    return this.#value;
  }

  equals(other: BoardDescription): boolean {
    return this.#value === other.#value;
  }
}
