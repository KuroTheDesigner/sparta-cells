# Sparta Cells model research

Checked 2026-11-12. Public evidence below is from current official Google documentation and the official SDK's exact `v3.2.0` sources. Google documentation URLs now redirect to `aistudio.google.com`. No credentials, environment files, provider API requests, browser UI tests, code edits, or commits were used for this research.

## Recommendation

Use **`gemini-3.8-flash`** for grounded phone research, extraction, chat, uploaded audio, recommendations, reviews, location, and Maps stores. Its exact model page marks it stable and explicitly supports Search, Maps, structured output, and text/image/video/audio/PDF input; output is text. Limits are 1,048,576 input and 65,536 output tokens. [Model specification](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)

Use **`gemini-3.8-live`** for bidirectional voice. Google marks it stable and describes it as the default low-latency audio-to-audio model without reasoning-induced delays. It supports Search but not Maps or structured output. Prefer it over `gemini-3.8-live-extended-thinking` for the short requirements interview. [Live specification](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live)

This is a production/latency/cost judgment, not a measured benchmark. Flash's introductory pricing is $0.75/1M input and $3.75/1M output tokens through December 31, 2026. Pro Preview costs $2/$12 for prompts up to 200k tokens and $4/$18 above that. Avoid making a preview Pro model the default for repeated small research/extraction calls. [Flash migration/pricing](https://ai.google.dev/gemini-api/docs/whats-new-gemini-3.8), [Pro pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.1-pro-preview)

## Configuration implications

- **Thinking:** Replace existing budgets `0`, `512`, and `8192` with `thinkingConfig.thinkingLevel` for Flash. Recommend `LOW` for ordinary calls and `HIGH` for explicit deeper thinking; supported levels are low/medium/high, default medium. `minimal` errors on 3.8 Flash. These are reasoning-depth controls, not equivalent token counts. SDK 3.2.0 defines both `thinkingBudget` and `thinkingLevel`; the shared type does not establish per-model support. [Exact Flash support](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [SDK ThinkingConfig](https://raw.githubusercontent.com/googleapis/js-genai/v3.2.0/src/types.ts)
- **JSON:** Use `responseMimeType: 'application/json'` plus `responseJsonSchema` for extraction without tools; retain application validation. Google explicitly documents structured output with Search for Gemini 3, including 3.8 Flash, but labels tool-plus-structured-output **preview**. Current examples use Interactions API; they do not independently prove this app's exact `generateContent` request combination. Keep the existing research-then-extraction flow unless the server probes justify combining it. [Structured output](https://ai.google.dev/gemini-api/docs/structured-output#tools), [SDK schema configuration](https://raw.githubusercontent.com/googleapis/js-genai/v3.2.0/src/types.ts)
- **Maps:** Current official support table explicitly includes 3.8 Flash and permits combining Maps with Search on 3.5 Flash and later. No older Maps-only model is needed on public evidence. Examples now use Interactions API; probe existing `generateContent` + `googleMaps` + `retrievalConfig.latLng` and actual Maps grounding metadata. Keeping the two existing store calls is the smallest change. [Maps support and combinations](https://ai.google.dev/gemini-api/docs/maps-grounding#supported-models)
- **Live setup:** Omit `thinkingConfig` entirely for ordinary 3.8 Live. Do not set `proactiveAudio: false` or `enableAffectiveDialog`. Preserve AUDIO response modality and input/output transcription for the current transcript UI. Mid-session `sendClientContent` remains supported; `turnComplete: true` interrupts active generation. [Exact Live migration](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live#migrating)

## Ephemeral authentication: documented version conflict

Current Google guidance explicitly creates constrained `gemini-3.8-live` tokens and connects using **v1beta**. Tokens remain preview, Live-only; defaults are one use, one minute to start, thirty minutes expiry. [Ephemeral guide](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens)

However, exact SDK 3.2.0 token documentation says **v1alpha only**, and `live.ts` warns for other versions. Its implementation recognizes `auth_tokens/`, selects `BidiGenerateContentConstrained`, uses `access_token`, and constructs the URL with the supplied API version; the warning is not a hard rejection. Do not blindly change versions: the server owner's constrained-token creation AND Live setup probes must settle the working version. Return that same version to the hook. [SDK tokens](https://raw.githubusercontent.com/googleapis/js-genai/v3.2.0/src/tokens.ts), [SDK Live transport](https://raw.githubusercontent.com/googleapis/js-genai/v3.2.0/src/live.ts)

## Lifecycle and evidence boundary

Google lists Flash released September 2, 2026 and Live September 15, 2026, both with no announced shutdown. `gemini-2.5-flash` is deprecated and automatically routes to 3.5 Flash-Lite from December 1, 2026. The current lifecycle page does not give an exact row for the app's `09-2025` native-audio ID; do not assign it the `12-2025` successor's November 17 shutdown date. [Lifecycle](https://ai.google.dev/gemini-api/docs/deprecations)

The coordinating owner reports the actual key's catalog includes 3.8 Flash and both 3.8 Live IDs with the expected generation methods. That is supplied catalog evidence, not independently checked here. Public docs corroborate those exact models; runtime Search/Maps/JSON/audio/thinking/token/setup results remain the server owner's evidence. Catalog availability alone proves none of those feature combinations. Do not infer that `gemini-4-argon` or `gemini-4-carbon` means Pro.


## Actual runtime evidence from the implementation owner

The implementation owner used the configured server credential on November 12, 2026; no credential or ephemeral token values were printed or persisted. This section records runtime checks and is separate from the independent documentation research above.

- `models.list` and `models.get` returned `gemini-3.8-flash` with `generateContent` and `gemini-3.8-live` with `bidiGenerateContent`. Catalog availability alone does not establish feature compatibility.
- A small actual 3.8 Flash Search request with LOW thinking returned three provider grounding chunks. The initial probe used v1alpha. On final v1beta, an actual narrow `/api/ai/search` request admitted Samsung Galaxy S23 from exact GSMArena sources in 23.468 seconds, leaving local price and price currency null. Tool-free extraction used JSON MIME and LOW thinking.
- 3.8 Flash Maps with LOW thinking and `retrievalConfig.latLng` passed on final v1beta, returning SLOT's actual Maps place ID `ChIJd2cE4omROxARV_ETEpoxFOs` and a Maps URI. No inventory was inferred.
- 3.8 Flash accepted synthetic one-second silent WAV input with JSON output and HIGH thinking on both the initial v1alpha probe and final v1beta probe, returning `heardSpeech:false`. This establishes that request format only, not real microphone recognition or browser audio behavior.
- A constrained, single-use `gemini-3.8-live` token was created on v1beta and used for an actual WebSocket connection that received `setupComplete` in 1.97 seconds. No microphone, audio generation or browser session is claimed. SDK 3.2.0 printed its alpha-only warning, but the actual beta constrained setup succeeded; the warning is not a transport rejection.
- After restarting the dev server, the actual `/api/ai/live-token` endpoint returned HTTP 200, model `gemini-3.8-live`, API version `v1beta`, a token, approximately 599 seconds until expiry and 59 seconds to connect. Only these metadata were inspected.

- Final broad actual `/api/ai/search` on `gemini-3.8-flash`/v1beta returned HTTP 200 and `status:complete` in 149.863 seconds: 23 distinct smartphones, 42 distinct admitted source URLs, 3 sourced prices and 20 null prices, and 3 exact-model image metadata entries. All 23 returned phones passed the shared nullable Phone schema. This is a real provider/endpoint run, not fixture output.
- All three returned image URLs responded HTTP 200 with image content types: SLOT's S24 and S24 Ultra WebP photos and OnePlus's official OnePlus 12 JPEG. The coordinating owner independently downloaded and visually inspected all three assets: S24/S24 Ultra front-and-back product photos and an official two-color OnePlus 12 product image. This is asset-only visual inspection, not browser acceptance. HTTP/content-type and exact-model source metadata are evidence of availability and provenance, not completed browser/UI acceptance.

- Follow-up HTML checks independently matched the two SLOT returned prices to their Product Offer amounts (NGN 882,800 and NGN 589,900), preserving pre-owned labels despite inconsistent retailer NewCondition metadata. The third returned quote (iPhone 15, NGN 1,550,000) is provider/source-linked to Pointek; that amount was not independently found in a later fresh HTML fetch. Do not describe all three quotes as independently reconfirmed current prices or confirmed stock.
