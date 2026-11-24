# QUALITY BAR — E1 Checkout

**Surface mode:** Operate. The user is checking a quote and creating a synthetic sandbox order.

## Required behavior

- Switching the cart between ¥99 and ¥100 updates the coupon state and server-authoritative quote.
- At ¥99, C20 is unavailable and payable remains ¥99. At ¥100, C20 deducts ¥20 and payable is ¥80.
- The UI creates an order only through the local API and reports success only after the server response.
- Quote, order, and read-only Oracle facts agree for the same Run. Repeating the same idempotency key does not create a second order.

## Visual and interaction bar

- Use the user-approved prototype as the visual reference. Keep the desktop two-column layout and narrow-screen single-column order.
- Keep product, coupon, totals, and the primary action easy to scan. Amounts must remain legible and aligned across both threshold states.
- Preserve the prototype's payable-total hierarchy: 30px on desktop and 28px at 390px, for both ¥99 and ¥100.
- Keep heading and payable-total tracking at or above the Impeccable floor of -0.04em.
- Let panel borders define their depth without a second panel shadow; keep panel radii at 16px desktop and 14px at 390px.
- Use a drawn SVG for the select chevron, a CSS dot for the safety marker, and tabular numerals for money values.
- Preserve visible keyboard focus, labeled selection, meaningful status/error announcements, and reduced-motion behavior.
- Make the local sandbox boundary visible. Never imply a real charge, fulfillment, coupon redemption, or production checkout.
- Keep the interface restrained: light neutral canvas, bordered white panels, green action, restrained coupon accent, and no unapproved promotional content.

## Evidence required

- API and UI assertions pass for the approved E1 rules.
- Preserve prototype and implementation captures for both ¥99 and ¥100 at 1440×900 and 390px, with matching Run, Seed, and fake-clock context.
- Assert the implementation's payable amount uses the same computed font size as the prototype at both viewport widths.
- Assert the main heading and payable total's computed letter-spacing ratios stay at or above -0.04em on desktop and mobile.
- Assert panels have the expected border radius and no box shadow, the chevron is an SVG, the safety dot has no glyph, and payable values use tabular numerals.
- Use the independent CheckoutOracle to confirm backend amounts; screenshots alone do not establish correctness.

## Known limits

E1-R04 is deferred. Shipping and tax remain zero. No payment, persistence, real-user data, or external fulfillment exists. This card does not claim a formal accessibility certification or cross-browser compatibility beyond the tested Playwright Chromium run.
