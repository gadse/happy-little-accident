const MAX_CODE_POINTS = 2048;

/**
 * A board's display name.
 *
 * Invariants (enforced at construction):
 * - Not empty and not whitespace-only (`trim() !== ''`).
 * - At most 2048 Unicode code points.
 *
 * The value is stored verbatim — no trimming or normalization is applied.
 */
export class BoardName {
  readonly #value: string;

  private constructor(value: string) {
    if (value.trim() === '') {
      throw new Error('BoardName must not be empty or whitespace-only');
    }
    const length = [...value].length;
    if (length > MAX_CODE_POINTS) {
      throw new Error(
        `BoardName must be at most ${MAX_CODE_POINTS} code points, got ${length}`
      );
    }
    this.#value = value;
  }

  static of(value: string): BoardName {
    return new BoardName(value);
  }

  get value(): string {
    return this.#value;
  }

  equals(other: BoardName): boolean {
    return this.#value === other.#value;
  }
}
