---
name: redesign-existing-projects
description: Upgrade an existing website or application through an audit-first, targeted redesign without breaking functionality. Use when asked to redesign, visually polish, modernize, remove generic AI patterns, or improve an existing UI while preserving its stack and product behavior.
---

# Redesign Existing Projects

Improve what already exists. Do not rewrite the application or replace its design system by default.

## Workflow

1. **Scan** — Read the codebase, project conventions, framework, styling system, shared primitives, tokens, routes, states, and tests.
2. **Diagnose** — List concrete visual, interaction, content, accessibility, and responsive weaknesses. Distinguish verified issues from subjective opportunities.
3. **Prioritize** — Rank changes by user impact, visual impact, implementation risk, and consistency with the existing product.
4. **Fix** — Apply small, reviewable upgrades using the existing stack and shared primitives.
5. **Verify** — Inspect screenshots at representative mobile and desktop sizes, then run the project's accessibility and quality checks.

## Audit Areas

### Typography

- Preserve an intentional existing type system; do not swap fonts merely for novelty.
- Strengthen hierarchy with a coherent type scale, weights, line height, and tracking.
- Keep body copy readable and avoid overly wide text measures.
- Use tabular figures for prices, counts, dates, and dashboard data when alignment matters.
- Prevent awkward headline wrapping with balanced or pretty wrapping where supported.

### Color and Surfaces

- Use the project's semantic tokens instead of hardcoded colors.
- Keep neutral temperature, accents, shadows, borders, and elevation consistent.
- Remove decorative gradients, glass effects, noise, and shadows that do not communicate hierarchy.
- Check contrast in every supported theme before approving a visual change.

### Layout and Responsiveness

- Prefer purposeful composition over mechanically centered sections or repeated equal-card grids.
- Preserve information density appropriate to the screen: marketplace, form, dashboard, chat, or marketing.
- Use reliable grid and container constraints and avoid fixed dimensions that break localization or mobile layouts.
- Check optical alignment, vertical rhythm, overflow, touch targets, and navigation at all supported breakpoints.

### Interaction and States

- Provide visible hover, focus, active, disabled, loading, empty, error, and success states where relevant.
- Use motion only when it explains spatial change, provides feedback, or prevents a jarring transition.
- Prefer transform and opacity for motion and respect `prefers-reduced-motion`.
- Do not add scroll hijacking, inertia, parallax, or ambient motion to product flows unless explicitly requested and justified.
- Keep destructive actions confirmable and preserve keyboard and screen-reader behavior.

### Content

- Use concise, specific, action-oriented copy instead of AI marketing clichés.
- Keep action names consistent through button labels, dialogs, errors, and success messages.
- Use realistic, contextual examples; never fabricate production claims or alter real user data for visual variety.
- Make empty and error states explain the next useful action.

### Components and Icons

- Reuse and improve shared primitives before creating page-specific variants.
- Use cards, dialogs, drawers, badges, and elevation only when they communicate structure or state.
- Preserve the established icon family and stroke language unless the user approves a system-wide migration.
- Avoid new UI dependencies when the existing component system can express the design safely.

### Accessibility and Semantics

- Use semantic landmarks and controls, visible focus, correct labels, and keyboard navigation.
- Provide descriptive alt text for meaningful images and empty alt text for decorative images.
- Preserve focus traps, focus restoration, reduced motion, contrast, and logical heading order.
- Treat accessibility requirements and the project's domain conventions as constraints that override aesthetic preferences.

## Fix Priority

1. Broken accessibility, responsive behavior, missing states, or inconsistent interaction feedback.
2. Design-token, typography, spacing, hierarchy, and content inconsistencies.
3. Repeated generic patterns that weaken comprehension or product identity.
4. Optional visual and motion polish with measurable benefit.

## Rules

- Work with the existing framework, styling system, tokens, components, routes, and business behavior.
- Read project-specific skills and conventions first; they take precedence over this general design guidance.
- Treat all aesthetic suggestions as contextual heuristics, never automatic mandates.
- Do not change dependencies, fonts, icon systems, global tokens, or navigation architecture without a demonstrated need.
- Do not break functionality, authorization, localization, performance, or accessibility for visual novelty.
- Keep changes focused, testable, and easy to review.
