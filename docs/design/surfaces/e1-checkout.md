# E1 Checkout Surface Brief

**Status:** Approved baseline, recorded after implementation from the user's approved prototype and final evidence. The default ¥100 prototype coupon state was later corrected to match its displayed “已应用” state. This brief does not approve a redesign.

## Direction contract

**THESIS:** Make the checkout's arithmetic and business outcome easy to verify; every amount should read as a consequence of the selected synthetic cart and coupon.

**OWN-WORLD:** Use the approved E1 palette and component language: a quiet warm-neutral page ground, white bordered panels, deep green for the primary action and positive discount, and restrained terracotta for coupon status. Keep typography clear and surfaces flat.

**STORY:** The user sees a synthetic cart, switches between ¥99 and ¥100, understands whether C20 applies and what remains payable, then creates a local sandbox order whose result is confirmed by the server.

**FIRST VIEWPORT:** At desktop width, place the cart and coupon in the larger left column and the itemized summary and primary action in a right column. At narrow widths, stack the cart first and summary second. Keep the current checkout step visible and make the local sandbox state clear.

**FORM:** `seed: none (pinned)`. The user approved the existing HTML prototype before the service-backed implementation (“按此原型继续实现”), pinning both E1's visual language and its checkout experience. E1 therefore remains code-first with no image comp. The later `buildPath: comp` choice is the project default for future surfaces; it does not change this already-approved E1 path.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
