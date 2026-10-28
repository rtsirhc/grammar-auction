# Halloween local — QA

- Date: 2026-10-28
- Scope: LAN edition, teacher 1366×768 and three independent mobile Chromium contexts at 390×844.
- Mode: automated, headless, no external traffic allowed. Used installed Playwright runtime following browser-control workflow; prior MCP multi-session run had exhausted the process pool.

## Results

- 16 bilingual vocabulary tiles, 32 unique A1/A2 questions with corrections and examples.
- New room defaults to Halloween. Existing room filters remain saved; Halloween preset available.
- Three teams joined, placed bets via the UI and received expected balances.
- Student reload retained team and balance; teacher reload restored room and reconnected all teams.
- Advanced 35 rounds: bank exhaustion reshuffles instead of starting the final challenge.
- Web Audio context reached `running` after explicit sound toggle; mute toggled off. Output is synthesized locally; physical speaker loudness/listening quality not tested.
- Reduced-motion preference disables animated bats. UI includes moving ghost, bat, moon artwork, hand-drawn vocabulary SVGs and button transitions.
- All external requests blocked: zero attempted; zero page errors.
- `node tests/local-network.cjs` passed: real transport join, correct/incorrect scoring, 20% penalty, rejoin, late join, wrong code, no-internet LAN behavior.
- `node tests/question-flow.cjs` passed.
- Fixed clipped teacher explanation found in screenshots. Updated screenshot shows full correction, explanation, example, three team cards and leaderboard together.
- Fixed inherited bakery level assignment while integrating the new bank; B2 bakery cards retain B2.

## Evidence

- [Question](assets/2026-10-28-halloween/question.png)
- [Reveal and leaderboard](assets/2026-10-28-halloween/answer.png)
- [Student](assets/2026-10-28-halloween/student.png)
- [Vocabulary](assets/2026-10-28-halloween/vocabulary.png)
- [Landing](assets/2026-10-28-halloween/landing.png)

## Limits

Physical phones, hotspot radio and school firewall were not exercised. Browser contexts test app flows, not physical wireless conditions. Local Python browser test requires an installed Playwright environment; the delivered game only needs Node.js.
