# DESIGN.md — Maitri (Livestock Health Intelligence)

## Visual Theme & Atmosphere
Call this direction **"Liquid Ledger"** — Apple's Liquid Glass material
language (apple.com product pages, current iOS/macOS translucent UI)
applied to an agrarian palette instead of Apple's usual black/white/blue.
Deep greens, warm parchment, terracotta — but rendered as translucent,
layered, glowing glass surfaces floating over soft gradient depth, NOT
flat matte paper in bordered boxes. Think apple.com/iphone, not a
government gazette. Confident, oversized typography. Huge whitespace.
A handful of floating glass panels over a gradient background — not a
page tiled edge-to-edge with bordered cards and rule lines.

NOT: flat parchment fills, hairline table borders everywhere, small
all-caps ledger labels, dense multi-column tables, boxed-in panels.

## Material System — Liquid Glass
- **Surfaces:** translucent glass panels. Parchment/Ivory at ~70–85%
  opacity + `backdrop-filter: blur(20px)`, a 1px inner highlight along
  the top edge (near-white, low opacity) to fake a specular light catch,
  and a soft *colored* shadow (Deep Pine at low opacity, large blur,
  offset down) instead of a flat gray drop-shadow.
- **Backgrounds:** never a flat single-color page fill. Use a soft
  multi-stop gradient mesh — Deep Pine fading through Moss into warm
  Parchment/Wheat Gold, large soft color blobs, the way Apple product
  pages use diffuse colored gradients behind translucent content.
- **Navigation:** a sticky translucent bar (Deep Pine ~85% opacity +
  blur) that content scrolls beneath — not a solid opaque block.
- **Corner radius:** large and consistent, 20–28px on major panels
  (not 8–10px). Everything should feel soft and pill-adjacent.
- **Depth via blur and layering, not borders.** Stack translucent cards
  over the gradient/photo background to create depth. Borders and rule
  lines should almost never appear — depth comes from blur + shadow.

## Typography
- Apple-scale type: hero headline 64–96px, tight tracking (-0.02em to
  -0.03em), bold geometric sans. The literary serif (Fraunces/Lora) is
  demoted — use it only as a tiny accent (a pull-quote, an eyebrow
  label) if at all, it should not carry headlines in this direction.
- Recommended typefaces (free, web-safe, close to SF Pro's geometry):
  **Geist** (Vercel) or **Inter Tight** / **General Sans**. These give
  the clean geometric confidence Apple's marketing pages have.
- Big jumps in scale: a massive headline followed directly by small,
  quiet subtext — skip the "medium everything" weight dashboards
  usually default to.

## Component Stylings
- **Stat tiles →** glass cards floating on the gradient backdrop. Huge
  number, tiny label beneath, no border, soft colored shadow, gentle
  hover lift (translateY -4px + shadow bloom).
- **Buttons →** pill-shaped, solid Deep Pine or a subtle gradient fill,
  soft shadow, generous padding — Apple CTA proportions, not compact
  dashboard buttons.
- **Case list →** convert the dense ledger table into a card-based list
  on wider screens: each case as its own glass card with a photo
  thumbnail, generous padding, and a colored status dot — not a
  cramped multi-column table with rule lines.
- **Photography →** full-bleed, large, allowed to sit *behind* and
  bleed under the translucent nav and glass panels (this is the
  Apple move — content floats over media, not beside it in a box).

## Motion (build in Antigravity — Stitch can't do this part)
Stitch's static export won't include interactions, so these get added
when Antigravity turns the design into React:
- Scroll-linked fade/slide-up entrance per section.
- Subtle parallax drift on the background gradient as you scroll.
- Hover: cards lift 2–4px with shadow bloom; buttons scale ~1.02.
- A soft pulse on CRITICAL status dots — Apple-style breathing glow,
  not a hard blink.

## Palette (same hex values, different usage)
Same brand colors, now used as gradient stops and glass tints instead
of flat fills:
- **Deep Pine** `#1E3A2B` — gradient anchor + glass tint `rgba(30,58,43,0.75)`
- **Moss** `#3F6B4A` — secondary gradient stop
- **Parchment** `#F4EEE1` — glass surface base (translucent, never a flat page bg)
- **Espresso** `#4A3324` — body text on light glass surfaces only
- **Toasted Terracotta** `#C1622D` — critical-state glow/accent, used sparingly
- **Wheat Gold** `#D9A441` — secondary gradient stop / warning glow

## Elevation & Glow System (the missing "liveness")
Flat color + a single plain shadow reads as clean, not alive. Liveness
comes from stacking these together, not any one alone:

- **Ambient contact shadow** (every glass panel, always on):
  `0 1px 2px rgba(30,58,43,0.06)` — the panel touching the surface.
- **Elevation shadow** (the "floating" depth):
  `0 12px 32px rgba(30,58,43,0.14), 0 4px 10px rgba(30,58,43,0.08)`
  — two stacked shadows, not one. This is what makes a panel look
  lifted off the background instead of pasted on.
- **Inner top highlight** (the glass edge catching light):
  `inset 0 1px 0 rgba(255,255,255,0.45)` on the top edge only — this
  single line is what sells "glass" over "flat card with shadow."
- **Colored glow for critical/urgent states** (e.g. the "04 Cases"
  tile, the 104.2°F alert): `0 0 32px rgba(193,98,45,0.28)` in
  addition to the elevation shadow — a warm ambient bloom, not a
  border or badge.
- **Background light blobs:** 2–3 large, heavily blurred
  (`blur(80–100px)`) radial gradients in Moss and Wheat Gold, low
  opacity (12–20%), positioned behind the hero and stat row — this is
  what gives the gradient background actual depth instead of a flat
  wash. In Stitch this renders as static soft light pools; in
  Antigravity these can later drift slowly (see Motion).
- **CTA buttons/pills:** subtle gradient fill (Deep Pine → Moss, top
  to bottom) rather than flat fill, plus the elevation shadow at a
  smaller scale — this alone makes buttons feel tappable/alive rather
  than printed.
- **Optional grain:** 2–3% opacity noise texture over the background
  gradient only (never over glass panels) — this is what keeps a
  blurred gradient from looking like a flat Photoshop blur; it adds
  the tactile, slightly imperfect quality that reads as "designed,"
  not "generated."

Apply this stack consistently: contact shadow + elevation shadow +
top highlight on every glass panel by default; add the colored glow
only on the 1–2 most urgent/critical elements per screen, never on
everything.

## Content Contract — real features only
Stitch has no visibility into the actual app and will invent plausible
but fictional functionality to sell the mockup's vibe (e.g. "Dispatch
Paravet Team," "Manual Telemetry Override," "Radio Contact Owner" —
none of these are real). Treat any Stitch-generated copy/action as a
placeholder unless it matches this list. Update this list as the real
feature set grows — Antigravity should cross-check against it (and the
actual route/component files) before wiring any generated screen.

**Real actions that exist today:**
- Case actions: `Review`, `Dossier`, `Case Details`, `Animal Profile`
- Farmer portal: `Report Health Concern`, `Request Field Agent`,
  `Self-Report Case`, `Field Agent Visit`, `IoT Vitals`, `Health
  Passport`, `Register new animal`
- Vet workspace: `Follow-ups`, `Lab Samples`, `Visits & Schedule`,
  case status transitions (`Under Examination` → `Lab Referral` etc.)
- District/admin: filters (Time Window, Block/Taluka, Village),
  district stat counts, `Outbreak alerts`, `Pending approvals`,
  `Reports & exports`

**Real, but must match actual fields — don't let Stitch invent sensor
types.** `/routes/iot.py` (`POST /iot/data`) really does return live
telemetry per animal:
- `temperature` (°C, not °F — convert or relabel if a mockup shows °F)
- `activity_index` / `activity` (0–100 movement score) — this is a
  real signal that isn't shown in any current screenshot; worth adding
- `has_anomaly` / `is_anomaly` (boolean)
- `anomalies` (list of plain-text anomaly strings, e.g. "Hyperthermia
  detected: Core temp 40.1°C exceeds 39.5°C threshold")
- `risk_level`

There is **no** "Rumen Temp Sensor," "Telemetry Beacon," dual-sensor
graph, or multi-metric biometric panel in the schema — that's Stitch
invention. A single temperature reading + an activity score + the
anomaly text is the real shape. Design the telemetry card around
exactly those four fields, not a fictional sensor array.

**Not real — strip or ask before keeping:** dispatch/radio/paravet
team logistics, manual telemetry override, anything not backed by an
actual route. If a Stitch screen includes something not on this list,
flag it and ask before building it in — it may be a good idea, but
it's not yet scoped.

## Voice
Confident and quiet — closer to Apple's product-page copy (short,
declarative, a little poetic) than the earlier gazette/bulletin voice.
Drop the "Division," "logbook," bureaucratic flavor text almost
entirely; it worked for the ledger direction, it fights this one.

## Guardrails
- No hairline borders on more than one element per screen.
- No flat opaque background fills — everything sits on the gradient.
- No dense multi-column tables — convert to cards/lists with breathing room.
- One dominant hero element per screen, everything else recedes.
- Reserve the serif entirely for small accent moments, if used at all.
