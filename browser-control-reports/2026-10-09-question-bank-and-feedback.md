# Browser QA: question bank, feedback, and join error handling

- Objective: verify the expanded question bank, level filters, explanation display, and student join screen.
- Perspective: functional QA.
- Permissions: read-only isolated browser session.
- Browser: Chromium, headless desktop.

## Coverage

- Loaded the host screen with zero console, page, network, and HTTP errors.
- Confirmed 104 total question cards.
- Confirmed Clothing store cards by level: A1 (7), A2 (8), B1 (7), B2 (6).
- Confirmed the frequency adverb card includes a correction, explanation, and example.
- Rendered the same feedback through the teacher answer panel and student result panel; both include the explanation and example.
- Verified the student connection timeout now ends the pending attempt and returns control to the room-code form; peer-unavailable errors show a room-not-found message.

## Findings

No issues found in this smoke test.
