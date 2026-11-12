# Sparta Cells

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People choosing a phone who want to compare specifications and refine a shortlist. Audience detail beyond this is inferred from the existing comparison workflow; the user delegated remaining product choices.

## Product Purpose

Turn natural-language phone requirements into a sourced shortlist, then let people inspect and filter the actual specifications.

## Capabilities and Constraints

Preserve CursorRanker's text, price, CPU, battery, screen technology, refresh rate, charging speed, and wireless charging filters, saved selections, comparison table, and statistics. Carry through Gemini recommendations, grounded phone discovery/specification gathering, contextual chat, audio input, live voice, nearby stores, verification sources, and reviews. Search targets at least 20 distinct real matching phones. Shortages must remain visible; broadening requires an explicit action. Images must identify the exact model with a source or show an honest fallback. Never expose the permanent Gemini key to the browser.

## Brand Commitments

Product name Sparta Cells; GitHub slug sparta-cells. The requested production hostname is sparca-cells.vercel.app. The user requested an original replacement interface informed by Theo's Slopalytics, functional color, and purposeful animation, and delegated design decisions while unavailable.

## Evidence on Hand

CursorRanker includes 30 bundled phone records and filter/unit tests. Gemini-Phone-Ranker is the source feature inventory, with a configured local secret that must stay private. Bundled prices and specifications are historical catalog data, not live verified inventory. On November 12, 2026, the final Gemini 3.8 Flash/v1beta broad endpoint returned 23 distinct sourced phones, including 20 with unavailable local prices. Browser acceptance, microphone operation and retail stock remain unverified; see docs/DELIVERY.md for exact evidence boundaries.

## Product Principles

- Preserve user constraints and label unknown facts.
- Keep AI discovery and deterministic filters distinct and understandable.
- Show sources, progress, failures, and recovery actions.
- Never substitute an unrelated image or synthetic result for live evidence.

## Accessibility & Inclusion

Responsive keyboard-accessible controls, readable contrast, reduced-motion behavior, and useful alternatives when microphone or location access is unavailable.
