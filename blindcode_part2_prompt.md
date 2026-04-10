# Blind Code Platform — Part 2 Build Prompt
## Participant Flow + Routing

> Assumes Part 1 is complete. Firestore has `/problems` collection with 20 problems
> and `/contest/config` doc. Firebase is initialized in `lib/firebase.ts`.

---

## Routing Map (Next.js App Router)

```
/                        → redirect to /join
/join                    → participant entry page
/contest                 → main split-screen contest page (protected)
/admin                   → redirect to /admin/problems
/admin/problems          → problem management (built in Part 1)
/admin/contest           → greyed out, not built yet (Part 3)
```

### Route Protection Rules
- `/contest` — if no `participantId` in localStorage → redirect to `/join`
- `/contest` — if contest status is `"idle"` or `"ended"` and participant has no existing session → redirect to `/join`
- `/admin/*` — no auth yet, accessible directly (auth added in Part 4)
- `/join` — if participant already has a valid `participantId` in localStorage AND contest is `"active"` → redirect to `/contest` directly, skip the form

Create a `middleware.ts` at the project root to handle these redirects server-side where possible. For localStorage-dependent checks (participantId), handle in a client-side layout guard component since middleware cannot read localStorage.

Create `components/ParticipantGuard.tsx`:
- Wraps `/contest` page
- On mount: reads localStorage for `participantId`
- If missing → `router.replace('/join')`
- If present → fetch participant doc, confirm it exists in Firestore
- If doc missing (corrupted state) → clear localStorage → `router.replace('/join')`
- While checking: show a full-screen dark loader (spinner + "Loading..." in muted text)

---

## Firestore — New Collections to Add

```
/participants/{participantId}
  - name: string
  - problemId: string
  - code: string                   // last saved code, empty string initially
  - lastSavedAt: timestamp | null  // Firestore serverTimestamp, ms precision
  - joinedAt: timestamp
  - language: string               // default "javascript", participant can change once

/contest/config  (add these fields to existing doc from Part 1)
  - totalProblems: number
```

Create `lib/participants.ts` service file with these functions:
```ts
createParticipant(name, problemId) → Promise<string>  // returns participantId
getParticipant(participantId) → Promise<Participant>
updateCode(participantId, code) → Promise<void>        // updates code + lastSavedAt
listenToContest(callback) → unsubscribe function
```

---

## Pages to Build

### 1. `/join` — Participant Entry Page

Layout:
- Full screen, bg `#0a0a0a`, vertically and horizontally centered
- "Blind Code" in Inter 700, 36px, white — top center with some spacing
- Below: a card-like container (bg `#111`, border `1px solid #222`, rounded-lg, padding 32px, width 380px)
- Inside card:
  - Heading: "Enter your name" — 16px, white, 500 weight
  - Subtext: "You will be assigned a problem when you submit." — 13px, muted `#71717a`
  - Gap
  - Name input (full width, styled per Part 1 design system)
  - "Join Contest" button (full width, orange)
  - Below button: contest status indicator — small dot + text:
    - Green dot + "Contest is live" if status = `"active"`
    - Yellow dot + "Waiting for contest to start" if status = `"idle"`
    - Red dot + "Contest has ended" if status = `"ended"`
  - Status is fetched in real time via `onSnapshot` on `/contest/config`

On submit logic:
1. Validate name is not empty, trim whitespace
2. Check contest status — if not `"active"`, show inline error below button: "Contest is not active yet." — do not proceed
3. Check Firestore for existing participant with same name (case-insensitive, trim):
   - If found → save their `participantId` to localStorage → `router.push('/contest')`
   - If not found → assign problem (see logic below) → create participant doc → save `participantId` to localStorage → `router.push('/contest')`
4. Show loading state on button during async operations

Problem assignment logic (in `lib/participants.ts`):
- Fetch all current participant docs
- Build a frequency map: `{ [problemId]: count }`
- Fill in 0 for any problemId not yet assigned
- Find the minimum count across all 20 problems
- Collect all problemIds with that minimum count
- Pick randomly from that list
- This ensures round-robin distribution across 120 participants

---

### 2. `/contest` — Main Contest Page

Wrap entire page in `ParticipantGuard`.

On load:
- Read `participantId` from localStorage
- Fetch participant doc → get `problemId`, `name`, `code`, `language`, `lastSavedAt`
- Fetch problem from `/problems/{problemId}`
- Subscribe to `/contest/config` with `onSnapshot` — react to status changes in real time

**Layout — full viewport height, no scroll on outer container:**

```
┌─────────────────────────────────────────────────────────────────┐
│  TOPBAR (48px height)                                           │
├──────────────────────────┬──────────────────────────────────────┤
│                          │                                      │
│   LEFT PANEL (40vw)      │   RIGHT PANEL (60vw)                 │
│   Problem Statement      │   Code Editor                        │
│   (scrollable)           │   (fills remaining height)           │
│                          │                                      │
└──────────────────────────┴──────────────────────────────────────┘
```

**Topbar (48px, bg `#111`, border-bottom `#222`):**
- Left: "Blind Code" wordmark in orange, 14px, 600 weight
- Center: participant name — muted, 13px
- Right: last saved indicator — "Last saved: 12:34:05.231" (hh:mm:ss.ms format) — muted 12px. Shows "Not saved yet" initially. Updates every time a save completes.

**Left Panel:**
- Bg `#0f0f0f`, border-right `1px solid #222`, width 40%, overflow-y scroll
- Tab bar at top: `Description` | `Examples` | `Hints` — 3 tabs
  - Tab bar bg `#111`, border-bottom `#1a1a1a`
  - Each tab: 13px, muted text when inactive, white when active, orange 2px bottom border when active
- Tab content area: padding 20px, 14px text, line-height 1.7, color `#d4d4d4`
- Render content as plain text (no markdown rendering needed, just preserve newlines with `whitespace-pre-wrap`)

**Right Panel:**
- Use `@monaco-editor/react` — install it
- Editor config:
  - Theme: `vs-dark`
  - Language selector: small dropdown in top-right corner of editor panel (options: JavaScript, Python, Java, C++, C) — changing language only changes syntax highlighting, does NOT affect anything else
  - fontSize: 14
  - minimap: disabled
  - No run button anywhere — do not add one
  - scrollBeyondLastLine: false
  - wordWrap: "on"
- Auto-save logic:
  - Debounce saves by 1500ms after last keystroke
  - On each save: call `updateCode(participantId, code)` which writes to Firestore with `serverTimestamp()`
  - After save resolves: update topbar "Last saved" time using the returned timestamp
  - Show a subtle "Saving..." text in the topbar while save is in flight, replace with timestamp on success

**Contest ended overlay:**
- When `onSnapshot` detects status = `"ended"`:
  - Disable the Monaco editor (`options={{ readOnly: true }}`)
  - Show a full-screen overlay (position absolute, covers entire page, bg `rgba(0,0,0,0.85)`, z-index 50)
  - Overlay content (centered):
    - "Contest Ended" — 24px, white, 600
    - "Your code has been saved." — 14px, muted
    - "Last saved: {timestamp}" — 13px, orange
  - Do not allow closing this overlay

---

## UI Design Consistency (carry over from Part 1)

Same design tokens apply everywhere:
- Background: `#0a0a0a`
- Surface: `#111111`
- Border: `#222222`
- Accent orange: `#f97316`
- Text primary: `#ffffff`
- Text muted: `#71717a`
- Font: Inter

No gradients, no shadows, no decorative elements. Every pixel has a purpose.

---

## Acceptance Criteria for Part 2
- [ ] `/` redirects to `/join`
- [ ] `/admin` redirects to `/admin/problems`
- [ ] `/join` shows real-time contest status dot with correct color
- [ ] Submitting name when contest is idle shows inline error, does not proceed
- [ ] Submitting name when contest is active creates participant doc in Firestore and redirects to `/contest`
- [ ] Same name submitted again resumes existing session, no duplicate doc created
- [ ] `/contest` redirects to `/join` if no `participantId` in localStorage
- [ ] ParticipantGuard handles corrupted localStorage state gracefully
- [ ] Problem statement, examples, and hints load correctly per assigned problem
- [ ] Tab switching works between Description / Examples / Hints
- [ ] Monaco editor loads with correct language syntax highlighting
- [ ] Language dropdown changes highlighting only, no other side effects
- [ ] Auto-save fires after 1500ms debounce and updates Firestore doc
- [ ] "Saving..." shows in topbar during save, replaced by timestamp on success
- [ ] Last saved timestamp shows hh:mm:ss.ms format
- [ ] Contest ended overlay appears immediately when admin ends contest (real-time)
- [ ] Editor becomes read-only the moment contest ends
- [ ] Problem distribution is roughly equal across participants (verify in Firestore)
- [ ] No TypeScript errors, no console errors
-