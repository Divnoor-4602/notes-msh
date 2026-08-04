# Files

What each file in `swag/` does.

## Convex backend

| File | Purpose |
| --- | --- |
| `convex/schema.ts` | Tables and indexes for `giveawayLinks`, `claims`, `outbox` and `config` |
| `convex/convex.config.ts` | Registers the static hosting and Resend components |
| `convex/claims.ts` | `submit` assigns one link per person inside a transaction, `listRecent` feeds the admin table |
| `convex/links.ts` | Imports Fourthwall links from CSV or pasted text, reports pool counts, clears unclaimed links |
| `convex/outbox.ts` | The delivery queue: list pending, list by status, counts, mark sent, requeue |
| `convex/emails.ts` | Resend client, the automatic send path, the delivery webhook handler, and retry |
| `convex/settings.ts` | Runtime toggles read by the public page and written by the admin dashboard |
| `convex/http.ts` | `/api/outbox/*` for the Superhuman workflow, the Resend webhook, and the SPA catch-all |
| `convex/lib/admin.ts` | Shared secret check for admin functions |
| `convex/lib/validation.ts` | Normalizes names, emails and X handles, and pulls URLs out of a CSV |
| `convex/lib/emailTemplate.ts` | Renders the HTML and plain text swag email |
| `convex/lib/env.ts` | Reads deployment environment variables with defaults |

## Frontend

| File | Purpose |
| --- | --- |
| `src/main.tsx` | Mounts React and connects the Convex client |
| `src/App.tsx` | Picks between the claim page and the admin dashboard by pathname |
| `src/index.css` | Tailwind setup, theme colours, and the two animations |
| `src/lib/utils.ts` | `cn` class name helper |
| `src/components/ClaimPage.tsx` | Public page layout, loading skeleton, and the closed and sold out states |
| `src/components/ClaimForm.tsx` | The three field form and its submit handling |
| `src/components/SuccessPanel.tsx` | Confirmation screen with the link, copy button and claim button |
| `src/components/ui/Button.tsx` | Button with variants, sizes and a loading state |
| `src/components/ui/Field.tsx` | Labelled input with an optional prefix and hint |
| `src/components/admin/AdminPage.tsx` | Admin key gate and the tab shell |
| `src/components/admin/OutboxPanel.tsx` | Queue counts, the Superhuman prompt, mark sent and requeue |
| `src/components/admin/LinksPanel.tsx` | CSV upload and paste import, pool counts |
| `src/components/admin/ClaimsPanel.tsx` | Claim list with delivery status and CSV export |
| `src/components/admin/SettingsPanel.tsx` | Toggles for claims open and link reveal |
| `src/components/admin/Panel.tsx` | Shared card, stat, copy block and empty state pieces |

## Config and docs

| File | Purpose |
| --- | --- |
| `README.md` | Setup, delivery modes, Fourthwall import, deploy |
| `SUPERHUMAN.md` | Connecting the Superhuman Mail MCP server and draining the outbox |
| `changelog.md` | What changed and when |
| `.env.example` | Which variables to set and where they live |
| `vite.config.ts` | Vite with React and Tailwind, and the `@` alias |
| `tsconfig*.json` | Strict TypeScript for the app, the Vite config, and the Convex functions |
