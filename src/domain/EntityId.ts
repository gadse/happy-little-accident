/**
 * Type-safe entity identifiers.
 *
 * Each entity realm has its own id class — {@link CardId}, {@link ColumnId},
 * {@link BoardId} — so the compiler (not just a runtime throw) prevents passing
 * an id of the wrong realm to an entity. A `ColumnId` is not assignable to a
 * `CardId`, and vice-versa.
 *
 * The classes follow the project's value-object pattern (see steering
 * `PROJECT.md`): native `#`-private fields, a private constructor plus a static
 * factory, `equals`/`toString`, explicit return types, and immutability.
 *
 * ## How structural uniqueness is achieved
 *
 * TypeScript treats classes that declare `#`-private fields *nominally*: a value
 * is only assignable to such a class if it originated from that class. The
 * shared base {@link EntityIdBase} holds the common `#realm`/`#hex` state and
 * behaviour, but each concrete subclass declares its *own* distinct
 * `#`-private brand field. Because a `CardId` carries the `#cardBrand` field and
 * a `ColumnId` carries `#columnBrand`, neither is assignable to the other even
 * though they share the same shape otherwise — the guarantee holds at compile
 * time and at runtime.
 */

export type Realm = 'board' | 'column' | 'card';

const VALID_REALMS: ReadonlySet<string> = new Set(['board', 'column', 'card']);
const HEX_PATTERN = /^[0-9a-f]{6}$/;
const ENTITY_ID_PATTERN = /^(board|column|card)#[0-9a-f]{6}$/;
const COUNTER_MAX = 0xffffff;

/**
 * Parsed `{ realm, hex }` from a raw `<realm>#<hex>` string.
 *
 * Throws with the same messages the original `EntityId` used:
 * - unknown realm (with a valid-looking `#`): `Invalid EntityId realm: '<realm>'`
 * - anything else: `Invalid EntityId: expected '<realm>#<hex>', got '<raw>'`
 */
function parseRaw(raw: string): { realm: Realm; hex: string } {
  if (!ENTITY_ID_PATTERN.test(raw)) {
    const hashIndex = raw.indexOf('#');
    if (hashIndex !== -1) {
      const realm = raw.slice(0, hashIndex);
      if (!VALID_REALMS.has(realm)) {
        throw new Error(`Invalid EntityId realm: '${realm}'`);
      }
    }
    throw new Error(
      `Invalid EntityId: expected '<realm>#<hex>', got '${raw}'`,
    );
  }

  const hashIndex = raw.indexOf('#');
  const realm = raw.slice(0, hashIndex);
  const hex = raw.slice(hashIndex + 1);

  // These checks are redundant given the regex, but satisfy the type system.
  if (!VALID_REALMS.has(realm)) {
    throw new Error(`Invalid EntityId realm: '${realm}'`);
  }
  if (!HEX_PATTERN.test(hex)) {
    throw new Error(
      `Invalid EntityId: expected '<realm>#<hex>', got '${raw}'`,
    );
  }

  return { realm: realm as Realm, hex };
}

/**
 * Encodes a monotonic counter as a zero-padded 6-digit lowercase hex string.
 * Throws if the counter is not a non-negative integer or exceeds 0xFFFFFF.
 */
function counterToHex(counter: number): string {
  if (!Number.isInteger(counter) || counter < 0) {
    throw new Error(
      `EntityId counter must be a non-negative integer, got ${counter}`,
    );
  }
  if (counter > COUNTER_MAX) {
    throw new Error(
      `EntityId counter overflow: ${counter} exceeds maximum value of ${COUNTER_MAX} (0xFFFFFF)`,
    );
  }
  return counter.toString(16).padStart(6, '0');
}

/**
 * Shared base for the realm-specific id classes.
 *
 * Holds the common `#realm`/`#hex` state and the behaviour that does not depend
 * on the specific realm (`hex`, `realm`, `toString`, and the equality core).
 * It is `abstract` and cannot be constructed directly — construction goes
 * through one of the concrete subclasses ({@link CardId}, {@link ColumnId},
 * {@link BoardId}).
 *
 * This class is *not* structurally unique on its own; the concrete subclasses
 * each add a distinct `#`-private brand field to provide the compile-time
 * guarantee. `EntityIdBase` exists only as the shared implementation and as a
 * common supertype for code that legitimately accepts any realm's id.
 */
export abstract class EntityIdBase {
  readonly #realm: Realm;
  readonly #hex: string;

  protected constructor(raw: string) {
    const { realm, hex } = parseRaw(raw);
    this.#realm = realm;
    this.#hex = hex;
  }

  get realm(): Realm {
    return this.#realm;
  }

  get hex(): string {
    return this.#hex;
  }

  /**
   * Structural equality across any two entity ids: equal when realm and hex
   * both match. Kept on the base so cross-realm comparisons (which are always
   * `false`) remain expressible, and so subclasses inherit a single
   * implementation.
   */
  equals(other: EntityIdBase): boolean {
    return this.#realm === other.#realm && this.#hex === other.#hex;
  }

  toString(): string {
    return `${this.#realm}#${this.#hex}`;
  }
}

/**
 * Identifier for a {@link Card}. Realm is always `'card'`.
 */
export class CardId extends EntityIdBase {
  // Distinct brand: makes CardId structurally unique from ColumnId/BoardId.
  readonly #cardBrand = true as const;

  private constructor(raw: string) {
    super(raw);
    // Reference the brand so it is retained (and to satisfy the linter); the
    // value carries no meaning beyond making the class nominally distinct.
    void this.#cardBrand;
    if (this.realm !== 'card') {
      throw new Error(`CardId must have realm 'card', got '${this.realm}'`);
    }
  }

  /**
   * Parses a raw `card#<hex>` string. Rejects any string whose realm is not
   * `'card'` (defense-in-depth for untrusted input).
   */
  static of(raw: string): CardId {
    return new CardId(raw);
  }
}

/**
 * Identifier for a {@link Column}. Realm is always `'column'`.
 */
export class ColumnId extends EntityIdBase {
  // Distinct brand: makes ColumnId structurally unique from CardId/BoardId.
  readonly #columnBrand = true as const;

  private constructor(raw: string) {
    super(raw);
    void this.#columnBrand;
    if (this.realm !== 'column') {
      throw new Error(`ColumnId must have realm 'column', got '${this.realm}'`);
    }
  }

  /**
   * Parses a raw `column#<hex>` string. Rejects any string whose realm is not
   * `'column'` (defense-in-depth for untrusted input).
   */
  static of(raw: string): ColumnId {
    return new ColumnId(raw);
  }
}

/**
 * Identifier for a {@link Board}. Realm is always `'board'`.
 */
export class BoardId extends EntityIdBase {
  // Distinct brand: makes BoardId structurally unique from CardId/ColumnId.
  readonly #boardBrand = true as const;

  private constructor(raw: string) {
    super(raw);
    void this.#boardBrand;
    if (this.realm !== 'board') {
      throw new Error(`BoardId must have realm 'board', got '${this.realm}'`);
    }
  }

  /**
   * Parses a raw `board#<hex>` string. Rejects any string whose realm is not
   * `'board'` (defense-in-depth for untrusted input).
   */
  static of(raw: string): BoardId {
    return new BoardId(raw);
  }
}

/**
 * Creates a {@link CardId} from a monotonic counter value. The counter is
 * encoded as a zero-padded 6-digit lowercase hex string. Throws if the counter
 * is negative, non-integer, or exceeds 0xFFFFFF.
 */
export function makeCardId(counter: number): CardId {
  return CardId.of(`card#${counterToHex(counter)}`);
}

/**
 * Creates a {@link ColumnId} from a monotonic counter value. The counter is
 * encoded as a zero-padded 6-digit lowercase hex string. Throws if the counter
 * is negative, non-integer, or exceeds 0xFFFFFF.
 */
export function makeColumnId(counter: number): ColumnId {
  return ColumnId.of(`column#${counterToHex(counter)}`);
}

/**
 * Creates a {@link BoardId} from a monotonic counter value. The counter is
 * encoded as a zero-padded 6-digit lowercase hex string. Throws if the counter
 * is negative, non-integer, or exceeds 0xFFFFFF.
 */
export function makeBoardId(counter: number): BoardId {
  return BoardId.of(`board#${counterToHex(counter)}`);
}
