---
inclusion: auto
name: architecture
description: How the system is structured and behaves.
---



# Architecture


## Layered Structure

Keep business logic independent of React and the DOM. Structure the code in layers:

```
src/
  domain/         # Pure business logic, types, value objects — no React, no browser APIs
  application/    # Use cases and state orchestration — coordinates domain objects
  infrastructure/ # Local storage adapters, persistence — implements domain interfaces
  ui/             # React components and hooks — thin layer, delegates to application
```

**Rules:**
- `domain/` has zero external dependencies. No imports from React, browser APIs, or npm packages.
- `application/` may import from `domain/` only.
- `infrastructure/` implements interfaces defined in `domain/` and may use browser APIs.
- `ui/` imports from `application/` and `domain/` types only — never directly from `infrastructure/`.
- Data flows inward: `ui → application → domain`. Dependencies point inward only.


## Persistence

All data lives in a single JSON file on the user's local filesystem, chosen by the user at load time. The file contains all boards.

The `infrastructure/` layer owns all file access. No other layer reads or writes files directly.

On every save, the entire file is replaced with the current state. There is no partial update.

### File access strategy

File access uses **progressive enhancement** via a `StorageAdapter` interface with two implementations:

- **`FileSystemAccessAdapter`** — uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) (`showOpenFilePicker` / `showSaveFilePicker`) for true in-place read/write. Available in Chrome and Edge.
- **`DownloadUploadAdapter`** — fallback for browsers that don't support the File System Access API (Firefox, Safari). Load uses `<input type="file">`, save triggers a file download via `<a download>`.

At runtime, the app detects API availability and selects the appropriate adapter transparently. The rest of the app only depends on the `StorageAdapter` interface.

### Multi-tab behavior

If the same file is open in multiple tabs, last write wins. No conflict detection or merging is performed.

### Future: Tauri build

A Tauri-based desktop build is a viable future option if true in-place file access on all platforms becomes a priority. The `infrastructure/` layer would gain a third adapter using Tauri's file system API. No architectural changes would be required.


## Ordering

Columns within a board and cards within a column are stored as **ordered arrays**. Position is implicit in the array index — there is no separate `order` field.

When reordering (e.g. via drag-and-drop), the array is reconstructed in the new order and the board is persisted in full.


## Validation & Error Handling

Validation is enforced at the domain layer. Value objects (card name, board name, etc.) throw on construction if invariants are violated. The application layer catches these and returns a result type rather than letting exceptions propagate to the UI.

Use a simple discriminated union as the result type:

```ts
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };
```

The UI layer reads the `error` field and renders an inline message directly below the offending field. Errors are cleared as soon as the user modifies the input.

No silent truncation. If a value is invalid, the operation is rejected and the user is told why.


## Undo / Redo

Destructive actions (deleting a card, deleting a column, deleting a board) require explicit confirmation via a small inline confirmation prompt — not a modal dialog. There is no Ctrl+Z undo stack in the initial version.

This keeps the implementation simple and consistent with the "never block the user unnecessarily" principle. Undo stack support can be added later without breaking the architecture, since the application layer already owns all state mutations.


## Board Navigation

Navigation is handled by a minimal client-side router (e.g. a URL hash or React state machine — no external router library required).

Each tab manages its own file handle and state independently. Last write wins on concurrent edits to the same file.
