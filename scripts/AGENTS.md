# Verification scripts

## Purpose

Dependency-free regression checks for prompt, character, and memory behavior.

## Ownership

- Run with Node from the repository root; fixtures stay in memory.

## Local Contracts

- No test framework, live network calls, or real browser LocalStorage in these checks.
- Mock model responses at the client boundary; test resulting behavior and preserved data.

## Verification

- `node scripts/verify-coherence.mjs`

## Child DOX Index

None.
