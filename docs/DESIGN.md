# Design: Leveric Workbench

The workbench must look like it belongs on [leveric.ai](https://leveric.ai/). Josh's brief (transcript, 38:00 onwards): "branded, plain, matching these light colour themes", "less is more, minimalistic", subtle hover motion only, "just don't make it ugly", no AI-slop look. Every value below was taken from `https://leveric.ai/styles.css` on 26 October 2026 unless it is marked **(our call)**.

## 1. Brand principles
1. **Plain first.** Large uppercase type, flat fields of colour, thin rules. No gradients, glows, emoji or stock illustrations.
2. **Motion is a reward, not decoration.** Things slide or reveal on hover and on first view. Nothing loops or bounces.
3. **Numbers and labels in mono.** Section indices ("01 · Leverage"), step numbers, costs and timestamps use Geist Mono.
4. **Direct copy.** Short imperative sentences, AU/NZ spelling ("optimise", "enquiry", "organisation"). Example tone: "Build smarter. Scale further.", "Get hours back.", "No tech team needed."
5. **Trust signals are visible.** Every AI output shows its source quote, its status (draft, edited, approved) and its cost.

## 2. Colour tokens
| Token | Value | Use |
|---|---|---|
| `--ink` | `#0e0e0e` | Main text on light, primary button fill |
| `--ink-soft` | `#2a2a2a` | Secondary text on light |
| `--dark` | `#0b0b0b` | Dark section and hero background |
| `--card` | `#141414` | Cards on dark sections |
| `--field` | `#d5d5d3` | Main light background (warm grey) |
| `--white` | `#ffffff` | Text on dark, input fill, paper surfaces |
| `--blue` | `#1d35d0` | Single accent: focus ring, active step, links on hover, "approved" state |
| `--rule-l` | `rgba(14,14,14,.55)` | Hairline rules on light |
| `--rule-d` | `rgba(255,255,255,.16)` | Hairline rules on dark |

Status colours **(our call)**, kept muted so the blue stays the only strong accent:
| Token | Value | Use |
|---|---|---|
| `--warn` | `#b4540a` | "Unassigned", "needs review", flagged gaps |
| `--danger` | `#a3221b` | Errors, blocked source |
| `--ok` | `--blue` | Approved |

Texture: the site layers an SVG noise "grain" over `--field` (`--grain-ink`) and over `--dark` (`--grain-white`). Reuse the same inline SVG data URI as a background layer on page-level surfaces only, never on inputs or tables.

## 3. Typography
| Role | Font | Size | Weight | Tracking | Case |
|---|---|---|---|---|---|
| Display (hero, tool name) | Geist | `clamp(40px, 8.6vw, 176px)` | 600 | `-.05em` | Uppercase |
| H2 (section) | Geist | `clamp(28px, 4vw, 56px)` **(our call)** | 600 | `-.045em` | Uppercase |
| H3 (card title) | Geist | 20-24px | 600 | `-.04em` | Sentence |
| Body | Geist | 16-18px | 400-500 | `-.01em` | Sentence |
| Label, index, meta | Geist Mono | 11-13px | 500 | `.08em`-`.12em` | Uppercase |
| Numbers (cost, time, counts) | Geist Mono | inherit | 500 | `0` | n/a |

- Fonts: `Geist` and `Geist Mono` (variable, weights 100-900). In Next.js load both with the `geist` package or `next/font`.
- Section indices follow the site pattern: `01 · Source`, `02 · Extract`, `03 · Review`, `04 · Export`.

## 4. Spacing, shape, layout
- Page padding: `--pad: clamp(16px, 3.4vw, 48px)`. Phone gutter never below 16px.
- Radius: `0` for sections, tables, inputs and buttons; `12px` only for floating cards and dialogs (site uses both).
- Rules, not boxes: separate rows with 1px `--rule-l` hairlines instead of bordered cards where possible.
- Grid: 12 columns on desktop, single column under 768px. Workbench uses a two-pane layout on desktop (input left, output right) and stacked steps on phone.
- Max reading width for long text: 72ch.

## 5. Motion
| Token | Value | Use |
|---|---|---|
| `--ease` | `cubic-bezier(.16, 1, .3, 1)` | Default for transform and opacity |
| `--ease4` | `cubic-bezier(.76, 0, .24, 1)` | Clip-path reveals, page and panel wipes |

- Reveal on first view: `opacity .9s ease, transform 1.1s var(--ease)`, staggered with `calc(var(--i) * 50ms)`.
- Hover on links and buttons: `background .3s, color .3s`, arrow shifts 4px right with `transform .4s var(--ease)`.
- Text slide on hover (Josh's example: "see how these words move side to side"): duplicated label that slides up or sideways inside an `overflow: hidden` span.
- Loading: a thin `--blue` progress line plus a mono status label ("Extracting actions · 4s"). No spinners with logos, no skeleton shimmer.
- `prefers-reduced-motion: reduce` removes transforms and keeps only opacity fades.

## 6. Components
| Component | Notes |
|---|---|
| App shell | Top bar on `--field`: wordmark left, client switcher and run counter (mono, e.g. `RUNS 3 / 20`) right. No sidebar on phone. |
| Tools index | Numbered list of tools like the site's Tools section: index, name, one-line outcome, status chip (`LIVE`, `NEXT`, `PLANNED`), arrow link. |
| Stepper | Four steps from the shared workflow: Source, Extract, Review, Export. Mono numbers; active step underlined in `--blue`. |
| Source panel | Tabs: Paste text, Upload file, Upload audio. Always shows the paste fallback when a file or audio fails. |
| Editable register | Table with hairline rows. Columns depend on the tool. Each cell editable in place. Each row shows a source quote toggle. |
| Status chip | Mono uppercase, 1px border: `DRAFT` (ink), `EDITED` (warn), `APPROVED` (blue fill, white text), `UNASSIGNED` (warn). |
| Approval bar | Sticky bottom bar: status, cost of this run, primary `Approve →` button. Any edit flips status back to `EDITED`. |
| Export menu | Copy Markdown, Download CSV, Copy for Slack, Copy email. Disabled until approved. |
| Cost note | Mono line: provider, model, tokens in/out, cost (`$0.00 · Groq free tier`). |
| Empty, error, blocked states | Plain sentence that says what happened and what to do next, plus one action. Example: "No speaker names found. Add names to the roster or paste a transcript with names." |
| Buttons | Primary: `--ink` fill, `--white` text, square corners, label + `→`. Secondary: text link with arrow, underline on hover. |

## 7. Tailwind v4 mapping
Define tokens once in `app/globals.css`:

```css
@theme {
  --color-ink: #0e0e0e;
  --color-ink-soft: #2a2a2a;
  --color-dark: #0b0b0b;
  --color-card: #141414;
  --color-field: #d5d5d3;
  --color-white: #ffffff;
  --color-blue: #1d35d0;
  --color-warn: #b4540a;
  --color-danger: #a3221b;
  --font-sans: "Geist", system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, monospace;
  --ease-brand: cubic-bezier(.16, 1, .3, 1);
  --ease-wipe: cubic-bezier(.76, 0, .24, 1);
  --tracking-display: -.05em;
  --tracking-label: .1em;
}
```

Usage examples: `bg-field text-ink`, `font-mono uppercase tracking-label text-xs`, `ease-brand duration-500`.

## 8. Theme
- Workbench screens are light (`--field` background, `--white` paper for outputs) for long reading and editing.
- Hero and tools index header are dark (`--dark` with grain), matching the site's alternating sections.
- No user dark-mode toggle in phase 1 **(our call)**.

## 9. Do and don't
| Do | Don't |
|---|---|
| Uppercase display type with tight tracking | Rounded "SaaS" cards with drop shadows |
| One accent colour (`--blue`) | Purple gradients, neon, glassmorphism |
| Hairline rules and whitespace | Icons on every label |
| Show source quotes and status | Hide how the AI reached a result |
| Arrow text links ("Ask about this tool →") | "✨ Generate with AI" buttons |

## 10. Assets
- Wordmark and icon: white versions exist on the site (`wordmark-white-full`, `icon-white-full`). Ask Josh for the dark versions and SVG source before shipping; until then use the text wordmark "LEVERIC" in Geist 600.
- Integration logos (Notion, Xero, Vercel, Gmail, Supabase, Stripe, HubSpot, GitHub) are on the site under `/assets/software-logos/`. Use only for export targets that really exist.
