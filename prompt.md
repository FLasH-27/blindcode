# Blind Code — Leaderboard Prompt

> JavaScript only. No TypeScript.
> Only modify `/admin/contest` page and its related components.
> Do not break any existing functionality.

---

## Where It Goes

On the `/admin/contest` page, the participants section currently has:
- Left: search input
- Right: "Current Session (Live)" dropdown

Add a "Leaderboard" button to the RIGHT of that dropdown.
Button style: outlined, orange border, orange text, same height as the dropdown.
`border: 1px solid #f97316`, `color: #f97316`, `background: transparent`, `border-radius: 7px`, `padding: 7px 16px`, `font-size: 13px`.
On hover: `background: rgba(249,115,22,0.08)`.

Clicking it opens a full-screen overlay modal showing the leaderboard.

---

## Scoring Logic

Score is already stored per participant in Firestore. Leaderboard ranking:
1. Sort by `score` descending
2. Tiebreaker: sort by `lastSavedAt` ascending (earlier submission wins)

Compute this client-side from the participants array already loaded on the page.
Do not make extra Firestore calls — reuse existing data.

Participant display fields needed: `name`, `participantId` (show first 6 chars, e.g. `#a3f9c1`), `score`, `lastSavedAt`, `problemTitle` (resolve from existing problems lookup map).

---

## Leaderboard Modal

Full screen overlay: `position: fixed`, `inset: 0`, `background: rgba(0,0,0,0.88)`, `z-index: 50`.
Close on: X button top right, or pressing ESC, or clicking the backdrop.
Modal panel: centered, `width: 680px`, `max-height: 85vh`, `overflow-y: auto`, `background: #0d0d0d`, `border: 1px solid #222`, `border-radius: 16px`, `padding: 32px`.

### Modal Header
Left: "Leaderboard" in white 20px 600 weight.
Right: live participant count — `{n} coders` in muted `#444`, 13px. Then X close button.
Below header: thin divider `border-bottom: 1px solid #1a1a1a`, margin-bottom 24px.

---

## Top 3 Podium (shown only if 3+ participants have score > 0)

Three cards in a row above the full list. Order: 2nd place LEFT, 1st place CENTER, 3rd place RIGHT.
1st place card is taller/larger to create a visual podium effect.

```
  [  2nd  ]   [    1st    ]   [  3rd  ]
  shorter      tallest         shorter
```

Card styles:
- All three: `border-radius: 12px`, centered text, padding 16px 12px
- 1st place: bg `#1a0e00`, border `1px solid #f97316`, width 200px, padding 24px 16px
  - Crown icon above name: use a simple SVG crown or unicode `♛` in orange, font-size 24px
  - Name: white, 16px, 600
  - Score: orange `#f97316`, 22px, 700
  - ID: muted `#444`, 11px, monospace
- 2nd place: bg `#111`, border `1px solid #888`, width 160px
  - Medal: `✦` or `②` in `#aaa`, 18px
  - Name: white, 14px, 500
  - Score: `#ccc`, 18px, 600
  - ID: muted, 11px, monospace
- 3rd place: bg `#111`, border `1px solid #6b4c2a`, width 160px
  - Medal: `③` or `✦` in `#cd7f32`, 18px
  - Name: white, 14px, 500
  - Score: `#cd7f32`, 18px, 600
  - ID: muted, 11px, monospace

Podium row: `display: flex`, `align-items: flex-end`, `justify-content: center`, `gap: 12px`, `margin-bottom: 28px`.

---

## Full Ranked List

Table below the podium showing ALL participants (including top 3 again).

Columns: `Rank` | `Name` | `ID` | `Problem` | `Score` | `Submitted`

Row styles:
- Default row: `border-bottom: 1px solid #111`, `padding: 10px 0`, `font-size: 13px`
- Rank 1 row: left border accent `border-left: 2px solid #f97316`, `padding-left: 10px`, bg `rgba(249,115,22,0.04)`
- Rank 2 row: left border `border-left: 2px solid #888`
- Rank 3 row: left border `border-left: 2px solid #cd7f32`
- Score 0 rows: entire row muted at 50% opacity — they haven't submitted yet

Column details:
- `Rank`: `#1`, `#2`, etc — rank 1-3 in their respective accent colors, rest in `#444`
- `Name`: white, 13px, 500 — bold for top 3
- `ID`: first 6 chars of participantId prefixed with `#` — monospace, `#333`, 11px
- `Problem`: muted `#555`, 12px — truncate at 20 chars with ellipsis
- `Score`: white for >0, `#333` for 0. Right aligned.
- `Submitted`: `lastSavedAt` formatted as `hh:mm:ss` — muted `#444`. Shows `—` if null.

No action buttons in this table — read only.

---

## Empty / Zero State

If no participants have score > 0:
- Hide the podium entirely
- Show centered message in the modal: 
  ```
  🏆
  "No scores yet."
  "Scores will appear here once participants submit."
  ```
  Icon 32px, text 14px muted.

If fewer than 3 participants total:
- Show whatever podium slots are available, leave others empty.

---

## Real-time Updates

The leaderboard should reflect live data — since participants are already on a `onSnapshot` listener on the page, pass the same participants array as a prop or read from the same state. No new Firestore subscriptions needed. The leaderboard re-ranks automatically whenever the participants state updates.

---

## Acceptance Criteria
- [ ] "Leaderboard" button appears to the right of the dropdown, styled correctly
- [ ] Clicking it opens the full-screen modal
- [ ] ESC and backdrop click close the modal
- [ ] Top 3 podium renders with correct order (2nd left, 1st center, 3rd right)
- [ ] 1st place card is visually largest
- [ ] Tiebreaker works — earlier `lastSavedAt` wins on equal score
- [ ] Full ranked list shows all participants with correct columns
- [ ] Rank 1/2/3 rows have correct accent border colors
- [ ] Score-0 rows are muted
- [ ] Empty state shows when no scores exist
- [ ] Leaderboard updates live as participant data changes
- [ ] Zero console errors