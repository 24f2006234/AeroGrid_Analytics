# Credential exposure recovery

Private environment files must stay outside Git. Only `.env.example` templates
with empty or dummy credentials should be committed. Ignore rules also cover
environment variants and backups, including the previously tracked
`backend/.env` and `backend/.env.bak`.

## Required recovery for the historical exposure

1. Revoke and replace the exposed AirLabs API key, OpenSky password, and any
   other credentials stored in either historical file. Rotate reused passwords
   on other services too. Rotate any exposed OpenSky OAuth client secret.
2. Update local environment files and hosting secret settings with replacements.
   Never put replacement secrets into issues, commits, or frontend `VITE_*`
   variables; frontend variables are public.
3. Coordinate a Git history rewrite that removes `backend/.env` and
   `backend/.env.bak` from every affected branch and tag. Review other historical
   files for copied credentials. Back up work and coordinate with collaborators
   before rewriting or force-pushing shared history.
4. After publishing the rewritten history, have collaborators clone it again
   or carefully clean their existing clones so old commits are not reintroduced.
   Request removal of cached views and pull request references from GitHub where
   needed. Forks and existing clones may retain the credentials, so rotation is
   required even after cleanup.
5. Verify provider revocation and remote history cleanup before closing the
   credential exposure issue.

Removing files from the latest revision does not remove them from old commits.
The repository changes alone do not revoke credentials or clean remote history.

## Local commit guard

Run from the repository root:

```sh
python scripts/check_env_files.py
git config core.hooksPath .githooks
```

If you already use custom hooks, integrate this check into your existing
pre-commit hook instead of replacing its hook directory. The check examines the
Git index, including force-added files, and prints paths only. Python must be
available as `python`. Hooks must be enabled per clone and can be bypassed; this
guard does not scan arbitrary source code or validate template contents.
