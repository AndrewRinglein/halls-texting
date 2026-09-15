# Existing dashboard transition

## Fixed destinations

- Development repository: `https://github.com/AndrewRinglein/halls-texting`.
- Reference revision: `c9ecfa1` of `FrontierGamingSystems/halls-texting`; read `HANDOFF.md`.
- Existing Sites project: `appgprj_6aa3c8174f608191ae8d292ebc795086`.
- Existing production URL: `https://frontier-bingo-text-monitor.andrew595321.chatgpt.site/`.
- Existing Supabase project: `gdvzebqxecmanobdbhha`.
- Existing collector: cron job `bingo-sms-sync`, every five minutes, using Vault secret `bingo_monitor_sync_key`.

Keep the existing host. No replacement Site, database, subscription, or cron job is part of this repair. GitHub Pages cannot execute the Worker or its protected sync endpoint.

## How changes reach production

GitHub's existing workflow runs tests and the Worker build; pushing this repository does not publish the dashboard. Publishing is a separate Sites operation:

1. Review and commit the repaired source in the Andrew repository. The folder repair inventory is `research/folder-repair.json`. The existing hall directory and attribution rules must match the authoritative production data before publication, because server preparation can reseed or reclassify records.
2. Run `npm run install:ci`, `npm test`, `npx tsc --noEmit`, and `npm run build` against the exact source to publish.
3. Use the account that owns or can edit the existing Sites project. Obtain its source-repository write credential through Sites. Push the validated source to the Site's configured source repository/branch, without force-pushing over intervening changes or replacing the GitHub origin with an invented destination.
4. Preserve the existing hosting environment values. Securely configure any missing server-only `TD_API_KEY`, `TD_NUMBER`, `BINGO_SYNC_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` there. Reuse the existing sync key so the Vault-backed job continues working. Never place secret values in GitHub files, workflow literals, logs, or chat.
5. Package the tested Worker output using the Sites hosting workflow, save a version tied to the exact pushed commit, and deploy that saved version to the existing Site with its current access settings. Verify terminal deployment success and HTTP responses.
6. Validate full promotional history across dates, pagination, private state restrictions, anonymous/authenticated write denial, authorized sync, deduplication, and continued automatic collection. Keep a rollback version available.

The code must not be deployed before production access and live validation are available. The current Codex account returned `project not found` for this Sites project, and Supabase management required sign-in during the repair. These are access blockers, not reasons to create replacements.

## Cron and data checks

Do not run `supabase/schedule-sync.sql` during this repair. Inspect the existing job and Vault entry without printing the secret. Confirm one active job, schedule `*/5 * * * *`, and the current endpoint. Check HTTP status in `net._http_response` as well as `cron.job_run_details` and advancing `bingo_state.last_sync`; queued SQL success alone does not prove collection.

If hosting is explicitly moved later, first validate the new Worker endpoint with the existing credentials and data. Then update the URL of the same existing cron job. Do not run old and new collectors against conflicting directory versions.

The read-only `node scripts/check-live-history.mjs` checks the current live dashboard's public history and rejects an unauthenticated sync request. It does not establish direct database permissions or cron configuration. Those require secure project access and remain separate release gates.
