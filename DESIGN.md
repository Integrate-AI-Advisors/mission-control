# IntegrateAI Mission Control — Design System

Source of truth for all design decisions. Derived from brand-tokens.md, locked by /plan-design-review on 2026-04-10.

## Brand Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Terra | `#D97757` | Primary accent. CTAs, links, focus rings, active states |
| Dark | `#1A1A19` | Background |
| Cream | `#FAF9F5` | Foreground text on dark |
| Muted | `#9A9590` | Secondary text, captions |
| Green | `#4A7C59` | Discovery phase, success, healthy |
| Blue | `#4A6FA5` | Dashboard phase, data, running |
| Amber | `#C4943A` | Warnings, degraded, pending |
| Red | `#C25B56` | Errors, failed, destructive |
| Purple | `#7B61A5` | Operations phase, automation |

## Phase Colors

| Phase | Color | Badge Style |
|-------|-------|-------------|
| Discovery | Green `#4A7C59` | `bg-brand-green/10 text-brand-green border-brand-green/20` |
| Dashboard | Blue `#4A6FA5` | `bg-brand-blue/10 text-brand-blue border-brand-blue/20` |
| Intelligence | Terra `#D97757` | `bg-terra/10 text-terra border-terra/20` |
| Operations | Purple `#7B61A5` | `bg-brand-purple/10 text-brand-purple border-brand-purple/20` |

## Typography

| Element | Font | Size | Weight | Extra |
|---------|------|------|--------|-------|
| Page title | DM Serif Display | `text-2xl` | 400 | Never bold |
| Section heading | DM Serif Display | `text-lg` | 400 | |
| Section label | JetBrains Mono | `0.6rem` | 600 | UPPERCASE, `tracking-[0.2em]`, Terra |
| Body text | Inter | `text-sm` | 400 | |
| Table header | JetBrains Mono | `0.6rem` | 600 | UPPERCASE, `tracking-[0.06em]` |
| Metric value | JetBrains Mono | `text-2xl` | 500 | |
| Badge/pill | JetBrains Mono | `0.55rem` | 600 | UPPERCASE, `tracking-[0.06em]` |
| Caption | JetBrains Mono | `0.6rem` | 400 | Muted color |
| Timestamp | Mono or Inter | `text-xs` | 400 | Muted color |
| Cost value | JetBrains Mono | inherit | 500 | |

## Component Library

shadcn/ui with Tailwind v3 compat. All components in `src/components/ui/`.

## shadcn Token Mapping

```css
--background: 60 2% 10%;       /* #1A1A19 */
--foreground: 48 33% 97%;      /* #FAF9F5 */
--primary: 16 62% 60%;         /* #D97757 (Terra) */
--destructive: 2 44% 55%;      /* #C25B56 */
--border: 40 4% 18%;
--ring: 16 62% 60%;            /* Terra focus ring */
--radius: 0.75rem;             /* 12px card radius */
```

## Layout

- Sidebar: 240px, client list, collapses to 64px icons at 1024px, hidden at 768px
- Deep dive: two-column (60% sessions / 40% integrations)
- Cards: 12px radius, `border-border`, hover `translateY(-4px)`
- Phase accent bar: 3px top border in phase color on client cards

## Interaction States

Every component must handle: loading (skeleton), empty (warm message + CTA), error (message + retry), success.

## Responsive Breakpoints

| Viewport | Sidebar | Content |
|----------|---------|---------|
| > 1024px | 240px visible | Two-column |
| 768-1024px | 64px icons | Single column |
| < 768px | Hidden (hamburger) | Single column, 2x2 stat grid |

## Accessibility

- Touch targets: 44px minimum
- Focus ring: Terra, 2px offset
- ARIA landmarks on nav, main
- `prefers-reduced-motion`: disable animations
- Phase badges: `aria-label` (not color-only)
