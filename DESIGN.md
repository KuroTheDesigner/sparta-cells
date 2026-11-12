---
name: Sparta Cells
description: A phone comparison workbench with visible sources and clear tradeoffs.
colors:
  paper: "#f5f5f0"
  panel: "#ffffff"
  ink: "#20231f"
  muted: "#61665e"
  rule: "#d9ddd3"
  lime: "#c8f36b"
  cobalt: "#244bd5"
typography:
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  display:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "42px"
    lineHeight: 1.07
    letterSpacing: "-0.035em"
rounded:
  control: "5px"
  research: "12px"
---

# Design System: Sparta Cells

## Overview

**Creative North Star: "The phone decision workbench"**

An Operate interface: compact controls, aligned specifications, and visible research status help people choose a phone. Lime marks actions and selection; cobalt marks focus and source context; amber marks incomplete research. The user delegated the remaining visual choices.

This is a source-derived implementation checkpoint, not visual acceptance. The requested Slopalytics reference calibration and desktop/mobile inspection remain pending T3 preview reconnection. The surface concept lives in `.impeccable/surfaces/compare.md`.

## Colors

`app/globals.css` owns the page palette. Dark mode maps paper to `#191d1a`, panel to `#222823`, ink to `#f0f3ea`, muted text to `#b0baac`, rules to `#414b40`, and cobalt to `#a7baff`.

`components/specs/specs.css` owns the closely related comparison palette, including sourced-value highlights and warning states. `components/ai/assistant.css` owns assistant surfaces. Preserve readable contrast in each theme.

## Typography

The implemented system uses Arial/Helvetica for controls, prose, and headings. Comparison values use tabular numerals. Headings use a compact scale; the main heading grows from 42px to 48px above 1600px. Source inspection has not established rendered font metrics or contrast acceptance.

## Layout

The page has a maximum width of 1800px. The desktop workspace pairs a 252px filter column with flexible results and a 32px gap. At 760px and below, filters become a dismissible drawer with keyboard focus management. At 420px, phone cards become a single column. Tables preserve horizontal access and virtualize large comparisons.

## Elevation & Depth

Quiet one-pixel rules separate most surfaces. Data density and tonal changes establish hierarchy. Avoid adding decorative elevation to specification cells.

## Shapes

Controls use small corners; the research form has a 12px radius. Use Radix icons or authored geometric SVG for controls and the price/battery plot. Actual phone photography requires exact-model source evidence; unavailable images use text fallback.

## Components

Primary buttons use lime with charcoal text. Cobalt focus rings remain visible on links, controls, and summaries. Native inputs expose explicit labels. Price slider steps scale with the result range; typed bounds remain available for exact values.

Unknown research specifications display as “Unknown”; unknown prices display as “Price unavailable.” They do not match selected numeric/boolean filters, lead statistics, win comparison highlights, or appear as invented plot values. Unpriced phones remain visible until a price range is adjusted. A list with no known prices shows “No sourced prices” in place of zero-valued price controls. Bundled catalog and web research remain visibly identified.

The plot transitions coordinates over 220ms as filters change. Research uses an animated progress track. Reduced-motion mode disables transitions, animations, and smooth scrolling.

## Do's and Don'ts

- Do keep actions, selection, evidence, and incomplete states visually distinct.
- Do preserve keyboard navigation, clear labels, and all filter groups.
- Do show actual sources beside research and photographs.
- Don't replace unknown facts with zero, false, or fabricated images.
- Don't describe source inspection, fixtures, or provider metadata as browser acceptance.
