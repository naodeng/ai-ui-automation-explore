# ADR-0001 — Keep blog drafts in ai-ui-automation-explore

**Status:** Accepted project-planning decision · **Date:** 2026-11-24

## Decision

`AI-Native-QA-Lab/ai-ui-automation-explore` is the code, business demo, experimentation, evidence and **canonical blog-draft repository**. The public blog site `naodeng/inaodeng.com` receives only reviewed/approved Markdown, manually synchronized after the experiments. Website and WeChat use one final source, not competing article versions.

Tools get their own research dirs and one article each; article depth depends on real UI automation value (full/topic/brief). Historical previous packages in `archive/` are immutable references, not editable drafts.

## Tradeoffs

A separate repository adds review/sync steps, but keeps test code, versions, evidence and writing connected while isolating blog site deployment. No automatic cross-repository publish is part of MVP.
