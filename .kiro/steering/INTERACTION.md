---
inclusion: manual
---


# User Interaction Patterns

<!------------------------------------------------------------------------------------
   Add user interaction patterns (use cases, workflows, flows) to this file.
   Keep business rules in BUSINESS.md instead.
------------------------------------------------------------------------------------->

## Basic Principles

These principles apply everywhere.

- Keyboard-first, mouse-friendly.
- Never block the user unnecessarily.
- Show progress for operations >200ms.
- Every destructive action must be undoable or confirmed.
- Prefer inline editing over modal dialogs.
- Navigation must be deterministic.
- Every action has visible feedback.


# Goals

## Goal 1: Visualizing the state of a project

The user needs a quick overview over the state of whatever they want to manage. This project shall provide a small kanban board similar to Trello that should aid in visualizing a state. It should not enforce a certain workflow.

This leads to the following core aspects:
 - The project offers several kanban-like board similar to Trello.
 - The user can move the cards between columns on a board as they see fit.
 - The user can create items (like ideas, project steps, etc.) as Cards
 - The user can name and rename the cards and columns at any time.

Non-Feaures:
 - The board should not enforce certain workflows or transitions between columns.


## Goal 2: Details where needed

If more detail than just a name is needed, it should be possible to express it.

The basic info necessary is:
 - title
 - date and time of creation

The following fields should be present but optional:
 - description
 - category
 - due date


## Goal 3: Enable quick editing, but still allow selection

A user should always be able to edit a field by double-clicking it. Aside from buttons, dropdowns, and the like, a single click should not do anything but select a card on the board.

On the card detail screen, a simple click plus mouse drag should select text just like on a normal web page.

Non-Features:
 - When a user tries to select text on the card detail page, the UI should not assume editing intent but let the user select.


## Goal 4: Copy/Cut/Paste follows familiar patterns

Copying, cutting, Pasting cards should work like on a normal file explorer so the user can use familiar patterns.

Copying, cutting, pasting works with CTRL+C, CTRL+X, CTRL+V.