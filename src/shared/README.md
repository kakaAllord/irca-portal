# src/shared

The rules more than one IRCA repository must agree on. Until 7 October 2026
they were one package that every app imported; now each repository keeps its
own copy, so each can be built and deployed alone (D48).

| Repository        | Keeps                                      |
| ----------------- | ------------------------------------------ |
| irca-backend      | all of it                                  |
| irca-portal       | all of it                                  |
| irca-registration | `registration/` and `web-security.ts` only |

**A copy that drifts is a bug, not a difference.** The backend refuses what
its copy of the permissions or the registration flow does not allow, so a
portal or form whose copy says otherwise shows a button or a question that
then fails. When you change a file here, make the same change in the other
repositories that keep it, in the same sitting, and say so in each commit.
To check two copies agree, from the folder that holds all three:

```bash
diff -r -I "from '\.\.\?/" backend/src/shared portal/src/shared -x '*.spec.ts'
diff -r -I "from '\.\.\?/" backend/src/shared/registration registration/src/shared/registration
```

No output means they agree.

The backend's copy differs only in its import paths, which end in `.js`
because the backend runs as plain Node modules; the portal and the form are
compiled by Next and leave them off. The tests for these files live in the
backend's copy (`*.spec.ts`).
