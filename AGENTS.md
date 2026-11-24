<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Signed-in pages live under `src/routes/_authenticated/_app/`; that layout redirects to `/onboarding` until the profile is complete, so every app page can rely on a full profile.
- Profile and course validation rules live in `src/lib/profile.ts` (zod) and are covered by `src/test/profile-rules.test.ts`; change rules there, not in forms.
- Browser data reads use `queryOptions` in `src/lib/queries.ts` with the browser client (RLS scopes rows to the user); AI calls go through `src/lib/tutor.functions.ts` behind `requireSupabaseAuth`; the tutor chat is rendered only inside the dashboard search box (`useTutorChat` + `TutorAnswers`), with no separate tutor route.
- Guided-tour targets are `data-tour="..."` attributes; keep them when restyling header or dashboard elements.
- The root auth listener clears the whole query cache whenever the signed-in account changes, and the app layout re-fetches any cached profile whose id differs from the session user, so one account's data never shows for another.
- Notes PDFs are built in the browser with jsPDF (built-in Latin fonts only), so AI notes from `src/lib/study.functions.ts` are plain English text in a fixed JSON shape (`notesSchema` in `src/lib/study.ts`).
- Add and edit course share one form in `src/components/AddCourseDialog.tsx`; duplicate detection and unit merging live in `src/lib/profile.ts` so both paths behave the same.
