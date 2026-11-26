---
name: AI UI Automation Explore
description: A calm, evidence-first interface for synthetic UI automation work.
colors:
  primary: "#17664f"
  primary-deep: "#124d3d"
  positive-pale: "#eaf3ee"
  warning: "#a64624"
  warning-pale: "#fff2eb"
  ground: "#f4f5f1"
  surface: "#ffffff"
  ink: "#17221f"
  muted: "#59645e"
  line: "#e4e8e2"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "clamp(30px, 3vw, 40px)"
    fontWeight: 690
    lineHeight: 1.12
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 670
  amount:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "30px"
    fontWeight: 710
    lineHeight: 1
    letterSpacing: "-0.04em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "12px"
  panel: "16px"
  panel-mobile: "14px"
  pill: "999px"
spacing:
  sm: "12px"
  md: "16px"
  lg: "22px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    height: "50px"
  select-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "48px"
  status-chip:
    backgroundColor: "#f3f8f4"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.pill}"
    padding: "8px 11px"
---

# Design System: AI UI Automation Explore

## Overview

**Creative North Star: "Calm Verification"**

The interface keeps synthetic business outcomes easy to inspect. Warm neutral page grounds, white bordered surfaces, concise labels, and a clear type scale give the operator room to compare state and amounts without turning the demo into a production-looking storefront.

Deep green carries the primary action and positive observations. Terracotta marks the Gold/Silver lifecycle action and expiry/unresolved states. E1 checkout, the M1 state overview, and the S1 reservation lifecycle use the shared visual system. M1 distinguishes the synthetic coupon's configured expiry from real-world policy.

**Key Characteristics:**
- A restrained, warm-neutral working surface.
- Green for primary actions and positive observations; terracotta for lifecycle actions and unresolved conditions.
- Clear separation between synthetic sandbox actions and real commerce.
- Expected contract checks remain distinct from results observed in an isolated local Run.

## Colors

Use color to distinguish action, positive outcome, and unmet condition while keeping most of the page neutral.

### Primary
- **Deep Green:** Primary buttons and positive coupon state.
- **Deep Green Shade:** Button hover and high-emphasis foregrounds.
- **Pale Green:** Focus and positive-status support surfaces.

### Secondary
- **Terracotta:** Unmet coupon threshold and warning state.
- **Pale Terracotta:** Low-intensity warning and coupon surface.

### Neutral
- **Warm Neutral Ground:** Main page background.
- **White Surface:** Checkout panels and form controls.
- **Ink:** Main text and total amount.
- **Muted Green Gray:** Helper text and secondary labels.
- **Soft Green Gray Line:** Dividers, input borders, and panel outlines.

**The Outcome-First Color Rule.** Use green only when the synthetic business state is positive or the action is primary. Use terracotta for a clearly unmet condition; never let accent color imply a real payment or entitlement.

## Typography

- **Display Font:** Inter with the project’s system sans-serif fallbacks.
- **Body Font:** The same UI sans-serif stack.
- **Label/Mono Font:** No separate label or monospace face is used.

**Character:** The typography is compact and neutral. Stronger weight and size distinguish the page title and payable total from the smaller labels used to scan the cart and summary.

### Hierarchy
- **Display:** 690 weight, 30–40px, 1.12 line-height. Used only for the page title.
- **Title:** 690 weight, 16px. Used for panel headings.
- **Amount:** 710 weight, 30px desktop and 28px at 390px, with tabular numerals. Used for the payable total.
- **Body:** 400 weight, 14px with 1.7 line-height; shorter descriptions may use 13px.
- **Label:** 670–720 weight, 13px. Used for form labels, steps, and coupon state.

**The Amount Legibility Rule.** Keep payable values prominent and aligned with tabular numerals. Heading and amount tracking must remain no tighter than -0.04em.

## Layout

The E1 surface centers a bounded checkout shell. At desktop widths it uses a broad cart and coupon column beside a narrower summary column. At 800px and below, the columns stack with the cart first and summary second. At 480px and below, the shell uses 16px side gutters and the panels use the smaller corner size.

The S1 flash-sale QA surface reuses the same calm, local-first visual system. It keeps all five stock buckets visible as separate facts, places the Fake Clock beside the read-only Oracle, and labels the purchase as synthetic. The queue route states that queue behavior is undefined rather than simulating one.

M1 uses a bounded state-overview layout: membership state and scenario actions occupy the broad column; the historical coupon and read-only Oracle sit in the side column; expected checks span the page below. At 900px and below the main columns stack, with the coupon and Oracle side by side until 560px. Narrow screens use a two-column state grid and one-column side panels.

The layout uses moderate gaps and generous panel padding so the cart, coupon, totals, and primary action remain separately scannable. Keep the selected amount and resulting payable total visible together in the narrow layout.

## Elevation & Depth

Panels use a thin border as their only edge treatment. The primary action is the one raised control and uses a soft green shadow at rest and hover. The select focus ring uses a pale green halo to show keyboard focus. Do not add a broad panel shadow beneath its border.

**The One-Elevation Rule.** A panel uses its border for separation; a raised shadow belongs to an actionable control.

## Shapes

The surfaces use softly rounded corners rather than pills for content panels. Panels use the larger corner on desktop and a smaller one on narrow screens. Inputs and the primary action share a compact radius; coupon cards are slightly softer. Only compact state chips use a full pill shape.

## Components

### Buttons
The primary action is a solid green control with a short lift on hover.
- **Shape:** Compact rounded corners with a 50px minimum height.
- **Primary:** Full-width, green fill, white text.
- **Hover / Focus:** Darker green on hover with a visible keyboard outline.
- **Disabled:** Reduced opacity with the hover lift removed.
- **M1 scenario actions:** Green denotes the upgrade fixture action; terracotta outlines the downgrade action. Both create isolated in-memory Runs and never create a purchase.

### Chips
- **Style:** The local sandbox label uses a pale green surface, dark green text, a fine green border, and a pill silhouette.
- **State:** A small CSS dot marks local status; text carries the meaning.

### Cards / Containers
- **Corner Style:** Larger on desktop, reduced on narrow screens.
- **Background:** White with a quiet neutral-green outline.
- **Shadow Strategy:** No panel shadow; the border carries separation.
- **Internal Padding:** Head row and content row use separate padding to preserve scan order.

### Inputs / Fields
- **Style:** White native select with a neutral border and a small authored SVG chevron.
- **Focus:** Green border with a pale green focus ring.
- **Error / Disabled:** The select remains enabled; the demo labels its current threshold state beside the control.

### Navigation
- **Style:** A three-step checkout sequence with numbered circles and a filled green current step. It remains horizontal at narrow widths.

### Coupon Status
The coupon card presents the rule and current state in one row.
- **Applied:** Green state text with the coupon condition met.
- **Below threshold:** Terracotta state text and the remaining amount.
- **Shape:** Warm-tinted surface, fine border, and compact rounded corners.
- **M1 historical coupon:** State is valid at the seed instant. Once simulated time advances, show expiry as unverified because no exact expiry is defined.

### Oracle Observation
The M1 side panel presents effective tier, authorization observation, membership event count, and coupon ledger state from the server. Keep the read-only Oracle visually separate from the action controls.

### Expected Checks
Each M1 rule keeps a “Expected Check” label. After a scenario or replay, show the local observation and preserve the distinction between a synthetic Run and an external-system conclusion.

## Do's and Don'ts

### Do:
- **Do** use the established green and terracotta colors to distinguish outcomes.
- **Do** format money with tabular numerals and keep the payable amount prominent.
- **Do** keep the local-only, no-payment notice near the main action.
- **Do** distinguish a seed-time coupon observation from a later expiry result.
- **Do** label local observations separately from contract expectations.

### Don't:
- **Don't** combine a broad panel shadow with its border.
- **Don't** draw interface icons with text glyphs; use CSS shapes for simple dots and SVG for the select chevron.
- **Don't** tighten heading or amount tracking past -0.04em.
- **Don't** make synthetic checkout copy imply a real charge or fulfillment.
- **Don't** claim an M1 coupon expiry or propagation delay that the demo did not observe.
- **Don't** imply the local authorization probe creates a Gold-only purchase.
