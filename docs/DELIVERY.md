# Delivery checkpoint

Product: Sparta Cells. Final home: https://github.com/KuroTheDesigner/sparta-cells.

Repository renamed from CursorRanker without changing repository ID `R_kgDOQKviyg`; origin updated. Branch `codex/sparta-cells` is the implementation worktree. Original checkout and Gemini source remain unchanged.

## Verification boundaries

- Final November 12 snapshot: all **109 tests in 17 files**, typechecking and the production build pass. Focused reviews found no remaining high/medium defects after the price-slider, mixed-source fallback and nullable-price corrections. Earlier counts below record intermediate checkpoints.
- **Final live broad acceptance passed:** the unmodified same-origin `/api/ai/search` endpoint returned HTTP 200 in 149.862 seconds with `status:complete`, 23 distinct sourced models, 23 evidence records, three sourced prices, twenty null prices/currencies, three sourced images and `constraintsRelaxed:false`. The owner independently counted the saved response. This satisfies the broad 20-model API acceptance requirement; it is not browser acceptance or a guarantee of current retail stock.
- All three returned product image assets (Galaxy S24 Ultra, Galaxy S24 and OnePlus 12) were downloaded outside Git and visually inspected as product photographs consistent with their exact-model source pages. Temporary image files were deleted after inspection. No page/UI screenshot or recording is claimed.
- Next.js 16.4.6 production build passes. Next 14.2.35 still had critical production advisories; the supported version upgrade removed them. Production dependency audit: zero vulnerabilities.
- On November 12, the retained nullable-spec candidate passed typecheck, all 97 unit tests in 17 files, and a fresh production build. The later advisor currency fix passed focused integration checks; final checks will run after live-search fixes settle.
- Unsupported optional research specifications are explicit nulls. Display, filtering, statistics, winner highlights and the price/battery plot preserve unknown values rather than treating them as zero or false.
- A later acceptance clarification extends this to price for broad, unconstrained suggestions: price and price currency may be null when no local price is sourced. Unpriced phones remain in the default result list, display "Price unavailable," do not win price rankings or receive chart positions, and are excluded when a user adjusts the price range. An all-unpriced list shows "No sourced prices" instead of zero-valued price controls. Explicit budget/price, new-only and local-stock requirements still require the corresponding evidence. Server and UI regression checks cover this distinction; final-model S23 and broad acceptance are in progress.
- The November 12 production dependency audit reports zero vulnerabilities. A scan using the configured secret found zero key matches in 88 source files or `.next/static`; the key value was not printed.
- Unit API responses are fixtures, not live proof. A November 12 bounded actual `searchPhones` diagnostic admitted one Samsung Galaxy S24 in 24.191 seconds, with NGN 589,900 explicitly identified as a pre-owned SLOT listing. Its source was `https://slot.ng/products/pre-owned-samsung-galaxy-s24-256gb`; the resolved SLOT CDN asset was downloaded and inspected as a phone product image, then the temporary copy was deleted. This was asset inspection, not browser acceptance or independent physical model verification.
- An earlier full unmodified `/api/ai/search` request returned HTTP 200 in approximately 120 seconds but admitted only one model: 322 grounding records, 85 resolved sources, 23 candidates, three invalid candidates, and 19 missing required field citations. It failed acceptance. Diagnosis established unavailable local price evidence, including retailer 429 responses; optional-price handling and bounded replenishment resolved the broad-search gate in the final run above.
- The source pipeline now separates cited narrative research, actual-page resolution (including single-Product JSON-LD), and extraction against server-assigned source indices. Explicit mixed-product rejection aliases are now excluded from both grounding fallbacks, with a search-level regression. The origin check now uses the public Host rather than Next's internal bind hostname. Independent live invalid-body probes returned 400 for same-origin and 403 for cross-site, without provider calls. All 24 server tests pass on this pre-model-migration snapshot.
- Updated-model defaults are now `gemini-3.8-flash` for text, Search, Maps, extraction and uploaded audio, and `gemini-3.8-live` for bidirectional voice, both confirmed by the configured key's catalog and official model documentation. Normal Flash calls use LOW thinking and explicit deep chat uses HIGH; Live has no thinking override. SDK and returned Live API version use v1beta. No automatic 2.5 fallback remains.
- Actual compatibility probes passed Search with grounding chunks, Maps with a real SLOT place ID/address/URI, and audio-input plus JSON/HIGH. The audio probe used synthetic silence and proves format acceptance only. Constrained Live token creation and actual WebSocket setupComplete passed on v1beta using SDK 3.2.0, despite its stale alpha-only warning. These are protocol checks, not microphone capture, spoken output or browser acceptance. Final endpoint/search validation on this model/version configuration is still in progress; earlier 2.5-model diagnostics do not establish final-model readiness. Official-source research is recorded in `docs/MODEL_RESEARCH.md`.
- The provider catalog confirms the configured live voice model supports bidirectional generation. This proves model availability only, not a microphone conversation.
- Image resolution checks source page title, model suffix and allowlisted image hosts; representative live photo inspection remains required.
- UI detector reports only Arial-family warnings. System sans is intentional for the Operate surface, as permitted by the skill's product guidance.

## Browser gate

Use only T3 collaborative preview. The exact reference is https://slopalytics.com, identified by in-app search. Visual reference inspection is unfinished. Preview navigation subsequently timed out and returned an explicit no-host/do-not-retry error. No external browser was substituted.

November 12 recheck: preview_open returned tab_1, but snapshot failed, corrected environment-port navigation timed out, and the next snapshot returned explicit NoAvailableHostError for environment `474911af-1787-4bb1-bb15-3bada3af53e5` with "Do not retry." Parent requested the user reconnect the T3 desktop preview. No alternate browser was used. Worktree dev server is port 3002.

Before merge: visually inspect the reference; test desktop/mobile discovery, filters, comparison, advisor, error/cancel/retry and reduced motion; capture genuine screenshots and an interaction recording outside Git; upload them through `gh pr --attach` (installed CLI supports this); verify hosted attachments; complete finish review/documentation.

## Deployment gate

Intended production address: **https://sparca-cells.vercel.app** (intentional spelling).

No `.vercel/project.json` exists in either checkout. Connected Vercel team inventory and repository search found no existing matching project. November 12 connector checks again returned the `nielatrms-7769s-projects` team and no project for the renamed repository or Sparta/Cursor name searches. A fresh `vercel whoami` now reports "No existing credentials found"; CLI login is absent, while connector authorization is current and working.

The connector exposes source upload and deployment tools. Its GitHub app currently lists only the `Nielae` namespace; target `KuroTheDesigner` repository linkage remains to be established. Do not mutate unrelated projects or claim source-upload metadata is a working Git connection. Once evidence gates pass, reuse any matching project found by identity, otherwise create the authorized project in the confirmed connected team, configure the key as a production server secret, and verify the production browser flow.

The implementation is prepared for a draft PR, whose link is tracked by T3/GitHub. Merge, deployment and production acceptance remain pending the browser/evidence and account-linkage gates above.
