# Browser QA Report

## Header

- Target: Grammar Rush, local Node HTTP server, teacher + three student contexts.
- Date: 2026-10-21
- Scope: local joining, betting, scoring and session recovery without external network access.
- Tester: Codex (automated exploratory QA).
- Mode: ai-driven, multi-session, headless Chromium, same agent. Teacher 1366×768; students 390×844.

## 1. Executive Summary

All covered flows passed. External network requests were blocked during the real-browser test; none were attempted. No page errors occurred.

## 2. Issues

Fixed during QA: student explanation text inherited white text on a white card. Explanation and heading now use the game's dark ink and red colors. Reviewed updated screenshot: [student](assets/2026-10-21-lan/student.png).

## 3. Issues Summary Table

No unresolved issues in the tested flows.

## 4. Testing Coverage

- Opened teacher and three separate student browser contexts through the local HTTP server.
- Joined all three students to the room, started a round, submitted bets and received the expected $1,100 balances.
- Reloaded a student: same team identity and balance, no duplicate team.
- Reloaded the teacher: round state, teams and balances restored; all three students reconnected.
- Verified no external requests and no page errors.
- Integration test `node tests/local-network.cjs`: actual HTTP/EventSource transport through the original game handlers; correct/incorrect bets, bonus distribution, 20% no-bet penalty, close/rejoin, late join, invalid code feedback and operation when browser reports no internet.
- Existing `node tests/question-flow.cjs` regression suite passed.
- Syntax and whitespace checks passed.
- Evidence: [teacher](assets/2026-10-21-lan/teacher.png), [student](assets/2026-10-21-lan/student.png).

## 5. Notes

- Initial browser-control MCP sessions stalled and exhausted local process capacity. Closed the identified headless test browser and completed the real-browser test through the installed Playwright runtime; all contexts and its test server were closed afterward.
- Physical phones, Wi-Fi radio/hotspot creation and firewall settings were not tested. Browser contexts simulate separate students, not physical network hardware.
- LAN transport uses one EventSource stream per browser, small HTTP posts and a 15-second comment heartbeat. No WebRTC, cloud signaling or external libraries are needed for local play.
- Public online mode still uses PeerJS. Its diagnostics/retries are improved, but it retains the network restrictions of WebRTC; this test does not claim to fix every online/carrier route.
