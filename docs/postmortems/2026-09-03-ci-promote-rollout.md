# Postmortem: rolling out the CI image-promotion job

**Date:** 2026-09-03
**Status:** Resolved
**Impact:** None to any real environment - this platform has nothing deployed that depends
on the `development` overlay yet. Cost was entirely in iteration time: multiple failed
pipeline runs and several rounds of GitLab access-token confusion before the feature
described in [ADR-0006](../decisions/0006-ci-driven-image-tag-promotion.md) actually worked.

## Summary

A CI stage was added to pin the development overlay's image tag to the exact commit SHA
after a successful build, closing a gap a dotenv artifact had been sitting there for
unused (see ADR-0006). The job's logic was verified as thoroughly as possible without a
real GitLab runner before it was first pushed - the exact script extracted from the parsed
YAML and run end-to-end against a disposable local clone, `sed` portability checked against
real GNU sed. None of that caught what actually broke, twice, and getting a working
credential in place took longer than either failure.

## Timeline

All same day.

1. Promote job written and pushed, verified as above.
2. First real pipeline run: both `*:promote` jobs fail immediately -
   `git: 'sh' is not a git command.`
3. Root cause found by pulling the exact `alpine/git:2.45.2` image locally and reproducing
   the failure directly: the image sets `ENTRYPOINT git`, so the runner's script invocation
   gets wrapped as `git sh -c '...'`. Local verification had run the script in a plain
   shell - never inside the image that would actually execute it.
4. Fixed with `entrypoint: [""]`. Confirmed against the real image again, not just the
   documented pattern: reproduced the original failure, reproduced the fix working, then
   re-ran the exact `sed` substitution inside that same container and found it's BusyBox
   `sed`, not GNU `sed` - different from what local testing had used, but the `[[:space:]]`
   regex already in place handled it correctly.
5. Pushed the fix. Next pipeline run: both jobs fail again, this time on the guard clause
   written for exactly this case - `GITOPS_DEPLOY_TOKEN is not set`.
6. A screenshot of Settings → CI/CD → Variables showed why: "There are no variables yet."
   Not a bug - a documented manual setup step (`docs/gitops.md` already described it) that
   simply hadn't been done before the pipeline was first triggered.
7. First token attempt reused a GitLab personal access token from earlier the same session
   that had already failed every API call it was tried against, including `/user` - a
   "fine-grained" token created with none of the right permissions granted. Caught before
   it reached a pipeline run.
8. Second attempt: create a Project Access Token scoped to the gitops repo, as originally
   documented. Blocked outright - "Project access token creation is disabled in this
   group."
9. Checked the group's Permissions and group features settings for a toggle to re-enable
   it. Not present under that name at this GitLab tier - a dead end, not pursued further.
10. Pivoted to a personal access token, this time using GitLab's "Legacy token" option
    specifically (the token-creation UI offers "Fine-grained token" and "Legacy token" as
    separate choices; step 7's broken token had come from the fine-grained path), scoped to
    `write_repository` only.
11. Verified directly before touching the pipeline again, not assumed: cloned the gitops
    repo and ran `git push --dry-run` with the new token over HTTPS. Clean exit on both the
    clone and the push check.
12. Added as `GITOPS_DEPLOY_TOKEN` (masked, unprotected - this repo has no branch
    protection configured yet, so a protected variable would have been invisible to the
    job).
13. Next pipeline run: both promote jobs pass. Confirmed past the green checkmark - pulled
    the actual commits from the gitops repo and checked `newTag` directly, rather than
    trusting the pipeline status alone.

## Root causes

1. **Local verification tested the logic, not the environment it would run in.** The
   script's correctness (regex, commit message formatting, idempotency check) was proven
   in isolation. The image's non-standard entrypoint was invisible to every check that
   didn't involve that exact image, which no local test did until after the first failure.
2. **A documented manual step was skipped, not broken.** The setup doc already said to
   create the token before this would work; it hadn't happened yet.
3. **GitLab has two access-token systems with similar names, different permission models,
   and no clear signal at creation time about which one a given workflow needs**
   ("Fine-grained" resource-permission tokens vs. "Legacy" scope-checkbox tokens), and the
   org's own policy (project access token creation disabled at the group level) removed
   what would otherwise have been the more obvious least-privilege fix. This step cost more
   turns than either of the two actual pipeline failures.

## What went well

- Every fix was verified against the real failure before being declared done, not assumed
  correct from reasoning: the entrypoint bug and its fix were both reproduced against the
  actual image; the final token's actual push permission was proven with a dry run before
  it ever touched a pipeline.
- The guard clause written for the missing-token case worked exactly as designed - it
  turned what could have been a cryptic git authentication failure into an immediately
  actionable message pointing at the setup doc.
- Nothing here had any real blast radius. A new feature, on a platform with nothing
  deployed against the overlay it touches yet, is exactly the situation where it's safe to
  find failures like this by actually hitting them.

## Follow-ups

- Recorded in [ADR-0006](../decisions/0006-ci-driven-image-tag-promotion.md)'s Consequences
  section, so anyone changing this job later starts from an accurate account of what broke,
  not a tidied-up one.
- Before adding a new CI job image: check its `ENTRYPOINT`
  (`docker inspect --format '{{.Config.Entrypoint}}' <image>`) locally first, rather than
  finding out from a failed pipeline.
- When a task needs a GitLab access token, state up front which type it needs and why
  ("Legacy"/classic vs. "Fine-grained") - this was the single biggest source of wasted
  effort in the whole rollout.
