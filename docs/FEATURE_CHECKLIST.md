# Sparta Cells preservation and delivery checklist

Baseline recorded before implementation. Checked capability boxes indicate code and unit coverage; browser acceptance and provider proof remain separate delivery gates.

## CursorRanker

- [x] Full-spec text search
- [x] Minimum and maximum NGN price; dual-ended control
- [x] Multi-select CPU with option search and counts
- [x] Multi-select battery capacity
- [x] Multi-select screen technology
- [x] Multi-select refresh rate
- [x] Multi-select wired charging speed
- [x] Wireless charging yes/no
- [x] Reset, persisted filters, mobile filters
- [x] Comparison: price, CPU, battery, screen technology, rear/front cameras, refresh, size, charging, video, wireless charging, resolution, headphone jack, SIM slots
- [x] Horizontal access/virtualization for large result sets
- [x] Statistics derived from visible phones
- [x] Light/dark/system theme

## Gemini source

- [x] Natural-language constraints and grounded model discovery (final API acceptance)
- [x] At least 20 distinct candidates on a broad live query; honest narrow-query shortage (23 broad, one S23-only)
- [x] Grounded specifications and verification/source links (final API acceptance)
- [x] Primary and runner-up recommendation with rationale (implementation and fixture coverage)
- [x] Contextual text chat and deep thinking (implementation and fixture coverage)
- [x] Recorded voice input/transcription (implementation and fixture coverage; microphone acceptance pending)
- [x] Live voice, input/output transcripts, summary-to-search (implementation and fixture coverage; real conversation pending)
- [x] Store search, manual/GPS location, maps/contact details (implementation and fixture coverage; live acceptance pending)
- [x] Reviews and local review persistence (implementation and fixture coverage)
- [x] Exact model image provenance with honest unavailable state (three returned assets inspected; browser display pending)
- [x] Cancel/retry/partial errors and no secret in client bundles (unit checks and actual bundle scan)

## Delivery gates

- [x] Typecheck, unit checks, build, security scan
- [x] Independent code review (two ordinary rounds plus scoped medium-finding follow-ups)
- [ ] Exact reference visually inspected in T3 preview
- [ ] Desktop/mobile T3 browser flow verification
- [ ] Genuine screenshot and interaction recording uploaded as GitHub attachments
- [ ] PR linked to T3, reviewed, merged, exact head verified
- [x] Repository renamed while preserving identity/history
- [ ] Existing Vercel project reused if present, server secret configured
- [ ] Production sparca-cells.vercel.app full flow verified
- [ ] Task-owned temporary media/helpers cleaned and merged branch removed

## Reference status

In-app Google search identified https://slopalytics.com. Navigation timed out, then the preview host returned an explicit unavailable/do-not-retry error. Search discovery is not visual inspection; reference calibration remains pending.
