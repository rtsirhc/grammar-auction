# Browser QA: explanation layout and auto round

- Objective: verify that the expanded explanation does not hide player cards and that Auto round controls are visible.
- Perspective: teacher desktop QA.
- Browser: Chromium, headless, 1440x1000.

## Coverage

- Loaded the host screen with no console, page, network, or HTTP errors.
- Rendered a full answer explanation with correction, WHY, and EXAMPLE.
- Verified the answer card was 151px tall and the player-card grid retained 421px of height.
- Visually inspected the screenshot: explanation text has readable contrast and all four player cards remain visible.
- Verified the Auto round checkbox is visible in the host controls.
- Unit test confirms Auto round calls Skip Timer once all connected teams have bet and can be disabled.

## Findings

No issues found in this run.
