# Blind Code — Landing Page Redesign Prompt

> JavaScript only. No TypeScript. Only modify `app/page.js` and `app/globals.css`.
> Do not touch any other file.

---

## Font Setup
A custom `.otf` font file is in `public/fonts/`. Read that directory to get the exact filename.
In `globals.css`, register it with `@font-face` and apply it to the tag line on home page i.e. "Think. Code. Pray."  Also on Website name that is Blindcode in top left 

---

## Layout — Hero is a 2-column split

```
LEFT HALF                          RIGHT HALF
----                               -----
Stickman video in a circle         Eyebrow pill tag
(with two rotating ring borders)   "Think." (white)
                                   "Code."  (white)
                                   "Pray."  (orange #f97316)
                                   Typewriter subtitle line
                                   [Join a Contest →] button
                                   live stats (participants · contest status)
```

**Left half:** dark bg, centered. A `<video>` tag (`autoplay muted loop playsInline`) showing the stickman video from `public/assets/` — find the exact filename by reading that directory. Video is cropped in a circle (280px, `border-radius: 50%`, `object-fit: cover`). Two `position:absolute` rings around it — 296px and 316px circles, `border-radius:50%`, first with `border: 1px solid rgba(249,115,22,0.2)` spinning 12s, second `border: 1px dashed rgba(249,115,22,0.08)` spinning 20s reverse. Use `@keyframes spin`.

**Right half:** flex column, justify center, padding 60px 50px. Tagline font-size 80px, font-weight 900, line-height 0.95. Each word on its own `<span>` as a block. Typewriter cycles 4 phrases with fade transition every 3s using `useEffect`. Join button: orange bg, black text, bold. Stats line below in muted `#333`.

---

## Below Hero — Organised By Bar

Full width bar `border-top: 1px solid #111`, `background: #080808`, centered flex row:
`"organised by"` muted text → Nexus logo image → `"for"` muted text → Avishkar logo image
Both logos from `public/assets/` — read directory for exact filenames. Logo height: 36px.

---

## Rules Section

Centered heading + terminal block (max-width 640px, margin auto).
Terminal: fake macOS window bar with 3 colored dots + `// contest_rules.js` filename right-aligned.
8 rules in monospace, rules 05 and 06 in orange, rest in `#b0b0b0`.

---

## Footer
Keep footer same as before.

---

## Design Tokens
- bg: `#0a0a0a`, surface: `#0d0d0d`, border: `#161616`
- orange: `#f97316`, text: `#ffffff`, muted: `#444`
- Use the custom font for ALL text on the page
- No gradients except a subtle `radial-gradient` orange glow behind the video circle

## Acceptance Criteria
- [ ] Custom font loads and applies site-wide
- [ ] Stickman video plays in circle with spinning rings
- [ ] Both logos load correctly
- [ ] Typewriter cycles phrases
- [ ] Organised-by bar shows both logos
- [ ] Zero console errors