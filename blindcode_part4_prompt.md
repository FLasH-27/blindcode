# Blind Code Platform — Part 4 Build Prompt
## Polish + Tab Switch Detection + Contest Timer + Admin Password Protection

> This is a JavaScript project. No TypeScript. No .ts files. No type annotations.
> Assumes Part 1, 2, and 3 are complete and working with zero console errors.

---

## STEP 0 — Re-run Full Error Audit Before Building

Before adding anything new, verify the existing app is clean:

- [ ] Open every route in browser, check DevTools console — zero errors, zero warnings
- [ ] Test the full participant flow end to end:
  1. Open `/join`, submit a name while contest is idle → should show error
  2. Start contest from `/admin/contest`
  3. Open `/join` again, submit name → should land on `/contest` with problem loaded
  4. Type in editor → "Saving..." should appear → then timestamp
  5. End contest from admin → participant should see ended overlay immediately
- [ ] Test the admin flow end to end:
  1. Add a problem in `/admin/problems`
  2. Edit it, verify changes saved
  3. Delete it with confirmation
  4. Start and end a contest, verify status card updates
  5. Click "View Code" on a participant — drawer should open with their code
- [ ] Fix anything broken before proceeding

---

## Feature 1 — Tab Switch / Focus Loss Detection

### What it does
When a participant switches to another tab, minimizes the browser, or switches windows during an active contest, it should be logged and warned.

### Implementation

In the `/contest` page component, add a visibility change listener:

```js
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      // log the tab switch to Firestore
      logTabSwitch(participantId)
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
}, [participantId])
```

### Firestore Changes

Add to `/participants/{participantId}`:
```
- tabSwitchCount: number     // starts at 0, increments on each switch
- tabSwitchLog: array        // array of timestamps of each switch
```

Add to `lib/participants.js`:
```js
logTabSwitch(participantId)
// increments tabSwitchCount by 1
// appends current serverTimestamp to tabSwitchLog array using arrayUnion
```

### Participant Warning UI

Each time a tab switch is detected:
- Show a warning toast/banner at the top of the `/contest` page (not a blocking modal)
- Banner: red background `#1c0a0a`, border `#7f1d1d`, text: "⚠ Tab switch detected. This has been logged." 
- Banner appears for 4 seconds then fades out
- Do not block the editor or interrupt their work
- If `tabSwitchCount` reaches 3 or more, make the banner persistent (does not auto-dismiss) and change text to: "⚠ Multiple tab switches detected. Your activity has been flagged."

### Admin Table Changes

Add two columns to the participants table in `/admin/contest`:
- `Switches` — shows `tabSwitchCount` as a number
  - 0 → muted gray text "0"
  - 1-2 → yellow badge
  - 3+ → red badge with bold number
- Keep `Action` column last

Update the View Code drawer:
- Add a section below the editor: "Tab Switch Log"
- Shows `tabSwitchCount` as: "Switched tabs {n} times"
- If `tabSwitchLog` has entries, list each timestamp on its own line formatted as `hh:mm:ss.ms`
- If count is 0: show "No tab switches detected" in muted green text

---

## Feature 2 — Contest Countdown Timer

### What it does
Admin sets a duration when starting the contest. A countdown timer is visible to both participants and admin. When it hits zero, contest auto-ends.

### Firestore Changes

Update `/contest/config`:
```
- durationMinutes: number    // set by admin when starting, default 60
- endsAt: timestamp | null   // calculated as startedAt + durationMinutes
```

### Admin Changes — Start Contest Dialog

Update the "Start Contest" confirm dialog in `/admin/contest`:
- Add a duration input inside the dialog before the confirm button
- Label: "Contest Duration"
- Input: number input, min 1, max 180, default value 60
- Unit label next to input: "minutes"
- When admin confirms start:
  - Calculate `endsAt = now + durationMinutes * 60 * 1000`
  - Write `durationMinutes`, `endsAt`, `startedAt`, `status: "active"` to Firestore in a single update

### Admin Timer Display

In the contest status card when status is `"active"`:
- Show a large countdown timer below the "Live" badge
- Format: `MM:SS` — e.g. "47:23"
- When under 5 minutes: turn timer text red
- When under 1 minute: add a pulse animation to the timer text
- Timer is calculated client-side from `endsAt` using `setInterval` every second
- When timer reaches 0:00 — automatically call `endContest()` and update Firestore

### Participant Timer Display

In the topbar of `/contest` page:
- Add a countdown timer on the right side (move "Last saved" to center)
- Same `MM:SS` format
- Same color rules: red under 5 min, pulse under 1 min
- When hits 0: trigger the contest ended overlay even if Firestore hasn't updated yet (optimistic)
- Timer calculated from `endsAt` field — listen to `/contest/config` to get this value

---

## Feature 3 — Admin Password Protection

### What it does
Simple password gate on all `/admin/*` routes. Not full auth — just a hardcoded password stored in an env variable. No Firebase Auth needed.

### Setup

Add to `.env.local`:
```
NEXT_PUBLIC_ADMIN_PASSWORD=blindcode2024
```

Note: Yes this is client-side and not truly secure — that is acceptable for this use case (internal college event). Do not over-engineer this.

### Implementation

Create `lib/adminAuth.js`:
```js
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD

export function checkAdminAuth() {
  return localStorage.getItem('adminAuthed') === 'true'
}

export function loginAdmin(password) {
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem('adminAuthed', 'true')
    return true
  }
  return false
}

export function logoutAdmin() {
  localStorage.removeItem('adminAuthed')
}
```

### Admin Guard Component

Create `components/AdminGuard.jsx`:
- Wraps all `/admin/*` pages (add to the admin layout)
- On mount: call `checkAdminAuth()`
- If not authed → show full-screen password prompt (do not redirect, just show gate UI)
- If authed → render children normally

Password gate UI:
- Same style as `/join` page — centered card on dark bg
- "Admin Access" heading — 16px, white
- Subtext: "Enter the admin password to continue" — muted
- Password input (type="password")
- "Enter" button — orange
- On wrong password: show inline error "Incorrect password" in red below input
- On correct password: call `loginAdmin()`, hide gate, show admin content — no page reload needed

Add a "Logout" button to the admin sidebar footer:
- Small, muted text button: "Log out"
- On click: call `logoutAdmin()` → immediately shows password gate again

---

## Feature 4 — Final UI Polish Pass

Go through every page and apply these fixes:

### General
- [ ] All buttons must have a hover state — if any button has no visual change on hover, add `hover:opacity-90` or a bg change
- [ ] All inputs must have a visible focus ring in orange — `focus:ring-1 focus:ring-orange-500 focus:outline-none`
- [ ] No layout shifts on page load — elements that load async should have skeleton placeholders or fixed-height containers
- [ ] All pages must be non-scrollable at the outer level except where explicitly intended (left panel in `/contest`, admin tables)

### `/join` Page
- [ ] Contest status dot should animate — pulse for green (active), static for others
- [ ] Input should auto-focus on page load (`autoFocus` prop)
- [ ] Pressing Enter in the input should submit the form

### `/contest` Page
- [ ] Left panel tabs: clicking a tab should not cause any layout shift
- [ ] Editor should fill 100% of available height with no gap at bottom
- [ ] "Not saved yet" text in topbar should be muted, not orange
- [ ] Language dropdown should be visually minimal — small, borderless, dark bg, white text

### `/admin/problems` Page
- [ ] Problem count badge should always be visible even when table is empty
- [ ] Add/Edit form should reset completely when dialog is closed and reopened
- [ ] Delete confirmation should show the problem title: "Delete '{title}'? This cannot be undone."

### `/admin/contest` Page
- [ ] Participants table should have a fixed header that stays visible when scrolling
- [ ] "View Code" drawer should remember scroll position when reopened for the same participant
- [ ] Add a search/filter input above the participants table — filters by participant name in real time (client-side, no Firestore query needed)
- [ ] Column header "Last Saved" should be sortable — clicking it toggles sort between most recent first / least recent first

---

## Acceptance Criteria for Part 4

### Tab Switch Detection
- [ ] Switching tabs during contest logs to Firestore and shows warning banner
- [ ] Banner auto-dismisses after 4 seconds for first 2 switches
- [ ] Banner becomes persistent after 3+ switches
- [ ] Tab switch count shows correctly in admin table with correct badge color
- [ ] Tab switch log shows in View Code drawer with timestamps

### Timer
- [ ] Admin can set duration when starting contest (1-180 min)
- [ ] Timer counts down correctly in both admin and participant views
- [ ] Timer turns red under 5 minutes
- [ ] Timer pulses under 1 minute
- [ ] Contest auto-ends when timer hits zero
- [ ] Participant sees ended overlay when timer hits zero

### Admin Auth
- [ ] All `/admin/*` routes show password gate if not authed
- [ ] Correct password grants access and persists across page refreshes
- [ ] Wrong password shows inline error
- [ ] Logout button clears access and shows gate immediately

### Polish
- [ ] All buttons have hover states
- [ ] All inputs have orange focus rings
- [ ] No layout shifts on any page
- [ ] Enter key submits the join form
- [ ] Participant name search works in admin table
- [ ] Last Saved column is sortable in admin table
- [ ] Zero console errors across all pages