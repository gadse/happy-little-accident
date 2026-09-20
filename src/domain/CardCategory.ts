const MAX_CODE_POINTS = 100;

/**
 * A card's category label.
 *
 * Invariants (enforced at construction):
 * - Not empty and not whitespace-only (`trim() !== ''`).
 * - At most 100 Unicode code points.
 *
 * The value is stored verbatim — no trimming or normalization is applied.
 */
export class CardCategory {
  readonly #value: string;

  private constructor(value: string) {
    if (value.trim() === '') {
      throw new Error('CardCategory must not be empty or whitespace-only');
    }
    const length = [...value].length;
    if (length > MAX_CODE_POINTS) {
      throw new Error(
        `CardCategory must be at most ${MAX_CODE_POINTS} code points, got ${length}`
      );
    }
    this.#value = value;
  }

  static of(value: string): CardCategory {
    return new CardCategory(value);
  }

  get value(): string {
    return this.#value;
  }

  equals(other: CardCategory): boolean {
    return this.#value === other.#value;
  }
}
