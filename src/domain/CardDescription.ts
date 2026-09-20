const MAX_CODE_POINTS = 10000;

/**
 * A card's free-form description.
 *
 * Invariants (enforced at construction):
 * - At most 10,000 Unicode code points. The empty string is valid.
 *
 * The value is stored verbatim — no trimming or normalization is applied.
 */
export class CardDescription {
  readonly #value: string;

  private constructor(value: string) {
    const length = [...value].length;
    if (length > MAX_CODE_POINTS) {
      throw new Error(
        `CardDescription must be at most ${MAX_CODE_POINTS} code points, got ${length}`
      );
    }
    this.#value = value;
  }

  static of(value: string): CardDescription {
    return new CardDescription(value);
  }

  get value(): string {
    return this.#value;
  }

  equals(other: CardDescription): boolean {
    return this.#value === other.#value;
  }
}
