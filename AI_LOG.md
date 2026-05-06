❯ /init do not edit README.md

● I'll explore the codebase structure to create an accurate CLAUDE.md.

● Explore(Codebase exploration for CLAUDE.md)
  ⎿  Done (23 tool uses · 47.9k tokens · 1m 5s)
  (ctrl+o to expand)

● Now I'll write the CLAUDE.md file.

● Write(CLAUDE.md)
  ⎿  Wrote 47 lines to CLAUDE.md
       1 # CLAUDE.md
       2
       3 This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
       4
       5 ## Commands
       6
       7 ```bash
       8 npm run dev      # Start dev server (localhost:3000)
       9 npm run build    # Production build
      10 npm run ts       # TypeScript type check (tsc --noEmit)
     … +41 lines (ctrl+o to expand)

● CLAUDE.md created. It covers the dev commands (including the absence of a test runner/linter), the @/* alias quirk, and the full data→API→UI
  architecture with key behavioral notes like the price-slider MAX_SAFE_INTEGER sentinel and query-param routing to the review page.

❯ generate an product-manager agent locally to assist in creating prompt PRD to either fix a bug or design a new feature

● I'll check the existing .claude directory structure, then create the PM agent.

  Searched for 1 pattern (ctrl+o to expand)

● No .claude directory yet. I'll create the agent file at .claude/agents/pm.md.

● Write(.claude\agents\pm.md)
  ⎿  Wrote 63 lines to .claude\agents\pm.md
      1 ---
      2 name: pm
      3 description: Product manager agent that produces structured PRDs for bug fixes or new features. Use when you need to define requireme
        nts, acceptance criteria, or scope before implementing a change.
      4 tools:
      5   - Read
      6   - Glob
      7   - Grep
      8   - WebSearch
      9 ---
     … +58 lines (ctrl+o to expand)

● The agent is live at .claude/agents/pm.md. Here's how to use it:

  Invoke it in any prompt:
  /pm fix the price filter bug
  /pm design a confirmation email feature for reservations

  What it does:
  1. Reads the relevant source files automatically (Glob/Grep/Read) before asking you anything
  2. Classifies the request as a bug fix or new feature
  3. Asks at most 3 questions if the request is ambiguous — never asks what it can find in the code
  4. Outputs a complete PRD with Problem Statement, Goals, Non-Goals, Solution, Acceptance Criteria, Edge Cases, and Open Questions

  The agent is project-local (in .claude/agents/), so it's only available in this repo.

✻ Churned for 32s

❯ generate a code-reviewer agent locally to check code implementation and security

● Write(.claude\agents\code-reviewer.md)
  ⎿  Wrote 79 lines to .claude\agents\code-reviewer.md
      1 ---
      2 name: code-reviewer
      3 description: Reviews code for correctness, security vulnerabilities, and implementation quality. Use before merging a change, after i
        mplementing a feature, or when auditing existing code for issues.
      4 tools:
      5   - Read
      6   - Glob
      7   - Grep
      8   - Bash
      9 ---
     … +72 lines (ctrl+o to expand)

● The agent is at .claude/agents/code-reviewer.md. Usage:

  /code-reviewer app/server/data_helpers.ts
  /code-reviewer the discount implementation
  /code-reviewer review everything changed in the last commit

  What it does:

  1. Locates all relevant files automatically via Glob/Grep if you name a feature area instead of a file
  2. Traces the full call chain — callers, dependencies, shared state
  3. Runs npm run ts when needed to confirm type errors
  4. Rates every finding by severity: Critical / Major / Minor / Info
  5. Runs a security checklist on every review (injection, XSS, exposed secrets, auth gaps, etc.)
  6. Gives a clear verdict: APPROVE, REQUEST CHANGES, or NEEDS DISCUSSION

  The security checklist fires automatically — you don't have to ask for it separately.

✻ Churned for 24s

