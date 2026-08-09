# Design — RemiScore

Locked design system for RemiScore (Expo SDK 57 · React Native · NativeWind). Produced by a Hallmark multi-page redesign. Every page renders this system; per-page overrides are not allowed — amend this file instead.

## Genre

**playful** — post-Linear soft school. Soft surfaces, low-chroma colour, friendly-but-restrained type. A casual card-game scorekeeper used among friend groups: warm, direct, clean, and exact.

## Macrostructure family

**Stat-Led** for data screens (Home, Circle, Circle Player, Session live, Session Player) — scores, ranks, and tallies are the narrative; ranked rows with large tabular numerals carry the page. **Workbench** treatment for the input flow (Add Round) — the stepper row is the primary object. Pages share this family shape; only component archetypes vary.

## Theme

Custom-tuned OKLCH palette anchored on Apple system blue. Greys are tinted toward the blue anchor hue (never zero-chroma).

| Token | Light (oklch) | Light (hex) | Dark (oklch) | Dark (hex) |
|---|---|---|---|---|
| `--color-paper` | oklch(0.975 0.008 255) | `#f2f4f9` | oklch(0.13 0.008 255) | `#0d1117` |
| `--color-paper-2` (card) | oklch(0.995 0.004 255) | `#fbfcfe` | oklch(0.16 0.008 255) | `#161b22` |
| `--color-paper-3` (fill/input) | oklch(0.93 0.010 255) | `#e8ebf2` | oklch(0.19 0.008 255) | `#21262d` |
| `--color-ink` | oklch(0.22 0.015 255) | `#1b1f27` | oklch(0.96 0.008 255) | `#f5f7fc` |
| `--color-ink-2` (muted) | oklch(0.50 0.012 255) | `#5d6471` | oklch(0.70 0.012 255) | `#9da8b8` |
| `--color-ink-3` (faint/placeholder) | oklch(0.55 0.012 255) | `#5f6673` | oklch(0.58 0.014 255) | `#788496` |
| `--color-rule` (hairline) | rgba(17,26,45,0.08) | — | rgba(255,255,255,0.1) | — |
| `--color-accent` | oklch(0.53 0.19 256) | `#0071e3` | oklch(0.60 0.18 256) | `#0a84ff` |
| `--color-accent-deep` (text on tint) | — | `#0056b3` | — | `#3899ff` |
| `--color-accent-ink` | — | `#ffffff` | — | `#ffffff` |
| `--color-accent-soft` | tint fill | `#e7f0fd` | dark tint | `#162842` |
| `--color-good` | oklch(0.45 0.13 155) | `#0a5d2e` | iOS green | `#30d158` |
| `--color-bad` | oklch(0.52 0.17 27) | `#c62828` | iOS red | `#ff453a` |
| `--color-focus` | oklch(0.60 0.18 256) | `#0a84ff` | oklch(0.60 0.18 256) | `#0a84ff` |

- Accent footprint ≤ ~3% of any viewport. Accent = CTAs, active states, focus, icon tiles. Never fills sections.
- `accent-deep` (`#0056b3` light / `#3899ff` dark) is the text/foreground companion for small-bold accent text on tinted fills (≥4.5:1). Icons and ≥3:1 elements may use plain `accent`.
- Input placeholders use the `placeholder:text-*` variant (`ink-faint` / `ink-dark-faint`), never a hardcoded color.
- No pure `#000` / `#fff` surfaces.
- Dark mode: deep neutral-navy `#0d1117` paper with elevated `#161b22` cards (GitHub-inspired, comfortable on eyes).

## Typography

- **Display**: system sans (SF Pro on iOS) — weight 800 extrabold, `letter-spacing: -0.03em` (tracking-tight), roman (no italic anywhere).
- **Body**: system sans — weight 400, `line-height 1.5`; bold only for emphasis.
- **Mono**: none. Data figures use `tabular-nums` (scores are tabular data).
- Scale (max 5 steps): hero 30px / title 24px / body 16px / meta 13px / label 11px uppercase `tracking-widest`.
- Headings contrast body by ≥300 weight units (800 vs 400). Body text ≥14px.

## Spacing

4-pt scale, named by role: `3xs 4 · 2xs 8 · xs 12 · sm 16 · md 24 · lg 32 · xl 48`. Sibling spacing via `gap`; margins only for optical breaks. Section rhythm deliberately varied (large top gap, tight bottom) — never equal padding everywhere.

## Motion

- Easings (named): `--ease-out` cubic-bezier(0.16, 1, 0.3, 1) entering · `--ease-in` cubic-bezier(0.7, 0, 0.84, 0) leaving. No bounce/overshoot on UI state.
- Durations: micro 120ms (press) · short 220ms (hover lift) · long 300ms (modal, sheet).
- **Primitives (max 3)**: press-scale 0.98 / 100ms · modal fade + scale 0.96→1 / 300ms · segment/tab crossfade 150ms.
- Animate `transform` + `opacity` only. Reduced motion (`AccessibilityInfo.isReduceMotionEnabled`) → opacity crossfade ≤150ms, functional motion stays.

## Microinteractions stance

- **Silent success.** No celebratory toasts for visible effects. Errors toast with retry.
- Confirm dialogs only for destructive/irreversible actions (delete circle/session/player, import-overwrite, end session). Reversible actions act immediately.
- Touch targets ≥ 44×44 (use `hitSlop` where visual target is smaller).
- Focus/active/disabled states on every interactive element; focus states appear instantly.
- Hover equivalents via `onPress` + `accessibilityRole`; no hover-only affordances.

## CTA voice

- **Primary**: accent fill, pill (`rounded-full`), 44px+, white extrabold text, one line. Microinteraction: press-scale 0.98.
- **Secondary**: hairline `rule` border, ink text. Used for End Session, Import, cancel.
- Destructive: `bad` fill / `bad` text, never both on the same neutral context.

## Per-page allowances

- App pages **MUST NOT** use hero enrichment (Tier-A/B) — function carries the page.
- Empty states: centered icon in tinted circle + muted message. No dashed borders, no nested cards.
- Cards: `paper-2` + hairline `rule` border + soft shadow (light only, `0 2px 12px rgba(17,26,45,0.06)`).

## What pages MUST share

- Accent `#0071e3` / `#0a84ff` + placement (CTAs, icon tiles, active states) ≤3% per viewport.
- Display 800 tracking-tight + body 400.
- Section head rhythm: uppercase 11px `tracking-widest` muted label, vertically stacked above content (never beside).
- CTA voice: primary pill shape/padding, secondary hairline outline.
- Cards: hairline + soft shadow light / elevated surface dark.
- Rank language: medal (gold/silver/bronze) top-3, numbered circle chip thereafter.
- Signed scores: `+N` / `−N` in `good` / `bad`, zero in muted.

## What pages MAY differ on

- Component archetype within the family (list row vs stepper vs stat grid).
- Header composition: large-title hero (Home) vs nav header (detail screens).
- Section order per page — IA is fixed, presentation order follows each screen's job.

## Exports

### Tailwind tokens (`tailwind.config.js`)

`surface` (paper) / `surface-alt` (card) / `surface-fill` (input) / `ink` / `ink-muted` / `ink-faint` / `rule` / `accent` (+`deep` text companion) / `accent-ink` / `accent-soft` / `good` / `bad`, each with a `-dark` variant (values above). Box-shadow: `shadow-soft = 0 2px 12px 0 rgba(17,26,45,0.06)` (light only). All component styles reference these tokens; no inline color/font values in components.
