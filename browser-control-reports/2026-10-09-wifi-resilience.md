# Browser QA: Wi-Fi resilience

- Objective: verify that a temporary network loss does not mark a student as kicked or erase room/team state.
- Perspective: student mobile QA.
- Browser: Chromium, headless mobile viewport.

## Coverage

- Loaded the student join screen with no console, page, network, or HTTP errors.
- Confirmed the join form and Change class control are available.
- Unit-tested offline and online transitions: offline pauses retry timers, preserves `kicked: false`, and online resumes reconnect scheduling.
- Unit-tested active-team reconnection paths and stored team identity preservation.
- Confirmed room-unavailable handling now keeps retrying with capped backoff instead of declaring a transient signaling error as a missing room.

## Findings

No issues found in this run.
