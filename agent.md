# ESL Grammar Auction Game

## Project Definition
A real-time multiplayer browser-based classroom game where teams bet on whether English sentences are grammatically correct (LEGAL) or incorrect (ILLEGAL). Uses WebRTC (PeerJS) for peer-to-peer communication — no backend server needed.

## Decisions Made
- **Target**: ESL students, A1–B1 level, any age
- **Theme/Colors**: Dark gameshow (`#0f172a` slate, `#f59e0b` gold neon)
- **Scoring**: $1,000 starting balance, pot distribution from wrong bets to correct teams
- **Timer**: 30 seconds per question
- **Images**: No (text-based game)
- **AI Features**: No
- **Data Storage**: None (session-based game)
- **Deployment**: Single HTML file, host anywhere (Vercel, local, etc.)
- **Device Support**: Desktop (host/big screen) + Mobile (student devices)

## Technology Stack
- Single HTML file (HTML5 + CSS3 + ES6+ JavaScript)
- PeerJS 1.5.2 (WebRTC signaling via public cloud)
- QRCode.js 1.0.0 (QR code generation)

## How to Use

### For the Teacher:
1. Open `grammar-auction.html` in a browser on the classroom computer
2. Click **"Host / Big Screen"**
3. A Room Code and QR code appear automatically
4. Students scan the QR code or type the link on their phones
5. Select how many teams (2–8), then click **Start Game**
6. Click **Next Question** to show sentences, then **Reveal Answer** to score
7. After all 50 questions (or click **End Game**), the Final Challenge begins

### For Students:
1. Scan the QR code or open the shared link
2. Enter team name and join
3. For each question: read the sentence on the big screen, choose LEGAL or ILLEGAL, set bet amount, submit
4. Watch the big screen for results!

## How to Deploy Online
1. Push to GitHub: `gh repo create grammar-auction --public --source=. --push`
2. Deploy to Vercel: `vercel --yes`
3. Share the Vercel URL with students
