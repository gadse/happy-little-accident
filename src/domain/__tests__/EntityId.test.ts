import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  CardId,
  ColumnId,
  BoardId,
  makeCardId,
  makeColumnId,
  makeBoardId,
} from '../EntityId';
import { arbCounter, arbCardId, arbColumnId, arbBoardId } from './generators';

// ---------------------------------------------------------------------------
// Unit tests — valid construction via .of
// ---------------------------------------------------------------------------

describe('Entity ids — valid construction', () => {
  it('BoardId.of("board#000000") exposes realm and hex', () => {
    const id = BoardId.of('board#000000');
    expect(id.realm).toBe('board');
    expect(id.hex).toBe('000000');
  });

  it('ColumnId.of("column#0001a3") exposes correct parts', () => {
    const id = ColumnId.of('column#0001a3');
    expect(id.realm).toBe('column');
    expect(id.hex).toBe('0001a3');
  });

  it('CardId.of("card#deadbe") exposes correct parts', () => {
    const id = CardId.of('card#deadbe');
    expect(id.realm).toBe('card');
    expect(id.hex).toBe('deadbe');
  });

  it('BoardId.of("board#ffffff") accepts the max hex value', () => {
    expect(BoardId.of('board#ffffff').hex).toBe('ffffff');
  });

  it('toString returns the original form "<realm>#<hex>"', () => {
    expect(CardId.of('card#0001a3').toString()).toBe('card#0001a3');
  });
});

// ---------------------------------------------------------------------------
// Unit tests — realm mismatch rejected by .of (defense-in-depth for raw input)
// ---------------------------------------------------------------------------

describe('Entity ids — realm mismatch on .of', () => {
  it("CardId.of rejects a 'column' raw string", () => {
    expect(() => CardId.of('column#000001')).toThrowError(
      "CardId must have realm 'card', got 'column'",
    );
  });

  it("CardId.of rejects a 'board' raw string", () => {
    expect(() => CardId.of('board#000001')).toThrowError(
      "CardId must have realm 'card', got 'board'",
    );
  });

  it("ColumnId.of rejects a 'card' raw string", () => {
    expect(() => ColumnId.of('card#000001')).toThrowError(
      "ColumnId must have realm 'column', got 'card'",
    );
  });

  it("BoardId.of rejects a 'card' raw string", () => {
    expect(() => BoardId.of('card#000001')).toThrowError(
      "BoardId must have realm 'board', got 'card'",
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests — equals
// ---------------------------------------------------------------------------

describe('Entity ids — equals', () => {
  it('returns true for two ids of the same realm with same hex', () => {
    expect(BoardId.of('board#000001').equals(BoardId.of('board#000001'))).toBe(
      true,
    );
  });

  it('returns false when realms differ', () => {
    const a = BoardId.of('board#000001');
    const b = ColumnId.of('column#000001');
    expect(a.equals(b)).toBe(false);
  });

  it('returns false when hex parts differ', () => {
    const a = CardId.of('card#000001');
    const b = CardId.of('card#000002');
    expect(a.equals(b)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Unit tests — error messages on invalid raw input
// ---------------------------------------------------------------------------

describe('Entity ids — error messages on invalid input', () => {
  it('throws the format error for a completely invalid string', () => {
    expect(() => CardId.of('not-an-id')).toThrowError(
      "Invalid EntityId: expected '<realm>#<hex>', got 'not-an-id'",
    );
  });

  it('throws the format error for an empty string', () => {
    expect(() => CardId.of('')).toThrowError(
      "Invalid EntityId: expected '<realm>#<hex>', got ''",
    );
  });

  it('throws the realm error for an unknown realm with valid hex', () => {
    expect(() => CardId.of('task#000000')).toThrowError(
      "Invalid EntityId realm: 'task'",
    );
  });

  it('throws the format error for uppercase hex digits', () => {
    expect(() => CardId.of('card#ABCDEF')).toThrowError(
      "Invalid EntityId: expected '<realm>#<hex>', got 'card#ABCDEF'",
    );
  });

  it('throws for hex with fewer than 6 digits', () => {
    expect(() => CardId.of('card#0000')).toThrowError(
      "Invalid EntityId: expected '<realm>#<hex>', got 'card#0000'",
    );
  });

  it('throws for hex with more than 6 digits', () => {
    expect(() => CardId.of('card#0000000')).toThrowError(
      "Invalid EntityId: expected '<realm>#<hex>', got 'card#0000000'",
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests — counter-based factories
// ---------------------------------------------------------------------------

describe('makeCardId / makeColumnId / makeBoardId factories', () => {
  it('encodes counter 0 as "000000"', () => {
    expect(makeBoardId(0).hex).toBe('000000');
  });

  it('encodes counter 1 as "000001"', () => {
    expect(makeCardId(1).hex).toBe('000001');
  });

  it('encodes counter 255 as "0000ff"', () => {
    expect(makeColumnId(255).hex).toBe('0000ff');
  });

  it('encodes counter 0xFFFFFF as "ffffff" (max)', () => {
    expect(makeBoardId(0xffffff).hex).toBe('ffffff');
  });

  it('throws for counter exceeding 0xFFFFFF', () => {
    expect(() => makeCardId(0xffffff + 1)).toThrow();
  });

  it('throws for negative counter', () => {
    expect(() => makeCardId(-1)).toThrow();
  });

  it('throws for non-integer counter', () => {
    expect(() => makeCardId(1.5)).toThrow();
  });

  it('assigns the realm correctly', () => {
    expect(makeColumnId(42).realm).toBe('column');
    expect(makeCardId(42).realm).toBe('card');
    expect(makeBoardId(42).realm).toBe('board');
  });
});

// ---------------------------------------------------------------------------
// Compile-time negative check — the point of the refactor.
// A ColumnId must NOT be assignable where a CardId is expected. If the id types
// ever collapse into a single structural type, this @ts-expect-error would have
// nothing to suppress and the build (tsc --noEmit) would fail.
// ---------------------------------------------------------------------------

describe('Entity ids — compile-time realm safety', () => {
  it('a ColumnId is not assignable to a CardId (type error)', () => {
    const columnId = makeColumnId(1);
    // @ts-expect-error a ColumnId cannot be used where a CardId is required.
    const misassigned: CardId = columnId;
    // Runtime sanity: it is genuinely a column id.
    expect(misassigned.realm).toBe('column');
  });
});

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Entity ids — property tests', () => {
  // Property 1: id serialization round-trip (per realm).
  it('Property 1 — toString() then re-construct produces equals() true', () => {
    fc.assert(
      fc.property(arbCardId, (id) => {
        expect(CardId.of(id.toString()).equals(id)).toBe(true);
      }),
    );
    fc.assert(
      fc.property(arbColumnId, (id) => {
        expect(ColumnId.of(id.toString()).equals(id)).toBe(true);
      }),
    );
    fc.assert(
      fc.property(arbBoardId, (id) => {
        expect(BoardId.of(id.toString()).equals(id)).toBe(true);
      }),
    );
  });

  // Property 2: counter encoding.
  it('Property 2 — make*Id(counter).hex equals zero-padded hex string of counter', () => {
    fc.assert(
      fc.property(arbCounter, (counter) => {
        const expected = counter.toString(16).padStart(6, '0');
        expect(makeCardId(counter).hex).toBe(expected);
        expect(makeColumnId(counter).hex).toBe(expected);
        expect(makeBoardId(counter).hex).toBe(expected);
      }),
    );
  });

  // Property 3: structural equality — equals() is true iff realm and hex match.
  it('Property 3 — same-realm equals() is true iff hex matches', () => {
    fc.assert(
      fc.property(arbCardId, arbCardId, (a, b) => {
        expect(a.equals(b)).toBe(a.hex === b.hex);
      }),
    );
  });

  it('Property 3 — cross-realm ids are never equal', () => {
    fc.assert(
      fc.property(arbCardId, arbColumnId, (card, column) => {
        expect(card.equals(column)).toBe(false);
      }),
    );
  });

  // Property 4: invalid strings are rejected on construction.
  it('Property 4 — any string not matching the pattern throws on construction', () => {
    const arbInvalidId = fc
      .string()
      .filter((s) => !/^(board|column|card)#[0-9a-f]{6}$/.test(s));

    fc.assert(
      fc.property(arbInvalidId, (s) => {
        expect(() => CardId.of(s)).toThrow();
      }),
    );
  });
});
