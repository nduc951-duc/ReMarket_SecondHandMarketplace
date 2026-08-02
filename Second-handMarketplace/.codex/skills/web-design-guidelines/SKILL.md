---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to review UI, check accessibility, audit design or UX, or check a site against modern web interface best practices.
---

# Web Interface Guidelines

Review UI files for compliance with the latest Web Interface Guidelines.

## Workflow

1. Fetch the latest guidelines from:
   `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
2. Read every user-specified file or pattern.
3. Check the code against all fetched rules.
4. Report findings using the terse `file:line` format required by the fetched guidelines.

Always fetch the source before each review so the audit uses the current rules. Treat the fetched document as the authoritative rule set and output-format specification.

If the user does not specify files or a pattern, ask which UI files should be reviewed.
