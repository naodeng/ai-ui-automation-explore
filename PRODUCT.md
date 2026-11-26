# Product

> English (canonical) · [简体中文](PRODUCT.zh-CN.md)

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

QA engineers, test automation engineers, and researchers evaluating AI-assisted web UI automation in controlled, repeatable conditions.

## Product Purpose

The project helps practitioners build, run, compare, and maintain AI-assisted UI automation through practical demos, deterministic regression tests, tool experiments, and traceable evidence. Success means that experiments can be reproduced, business outcomes can be checked independently from the browser agent, and useful findings can be turned into reviewed learning materials.

## Positioning

The project evaluates tools against the same three synthetic business cases and a deterministic Playwright baseline. Each case has an independent business Oracle, so a successful browser action alone does not establish that the business outcome is correct. The repository keeps implementation, tests, experiment evidence, and article drafts together for review.

## Operating Context

Work happens in a local-first Git repository. The cases use synthetic users, isolated Run IDs, fixed seeds, and fake clocks. The current workflow is to implement a small case slice, verify it with API and UI regression tests, preserve sanitized evidence, and record scope and unknowns. Blog drafts stay in this repository until human review and manual publication.

The original v1.0 documentation package contains project plans and contracts, not runnable business demos. Runnable slices described below were added to the working repository later.

## Capabilities and Constraints

- E1 has a local checkout demo for its approved coupon boundary, quote/order consistency, idempotency, and synthetic coupon lifecycle. Each bare checkout page receives a unique Run ID. M1 has a local membership lifecycle demo for its approved numbered rules and transition examples. S1 has a local flash-sale demo covering all five approved rules, including bounded reservation checks in one in-memory Node process and cancellation/timeout release. These checks do not prove cross-process/database concurrency, load behavior, or production semantics; see the P2 case reviews.
- Only explicit rules marked `approved_for_demo` may be implemented. Items under `unknowns_to_approve` stay out of scope until confirmed.
- Use synthetic fixtures only. Do not connect to production systems, real accounts, real payments, or real fulfillment.
- The project researches and evaluates existing UI automation tools; it does not define a required shared runtime for every tool or build a general-purpose browser agent.
- Deterministic regression tests remain the comparison baseline for exploratory and AI-assisted approaches.
- No comparative tool results or benchmark claims are available until real experiments have been run and recorded.

## Brand Commitments

The repository and project are named `ai-ui-automation-explore`.

## Evidence on Hand

- Approved synthetic case contracts and JSON Schemas are under `contracts/`.
- The E1 demo, automated tests, screenshots, and Run context records are under `demos/ecommerce-checkout/`, `tests/e1/`, and `evidence/e1/`.
- The M1 and first-slice S1 demos, regression tests, screenshots, and Run records are under `demos/`, `tests/`, and `evidence/`; see the P2 implementation reviews for rule status and limits.
- The project charter and roadmap are under `docs/project/`.
- No production data, customer testimonials, or third-party tool comparison results are present.

## Product Principles

- Use synthetic data and implement only user-approved contract rules.
- Compare tools on common cases with isolated Runs, fixed seeds, and fake clocks.
- Check business outcomes through independent Oracles; browser actions alone are not proof.
- Keep deterministic regression tests as the baseline and preserve sanitized, reproducible evidence.
