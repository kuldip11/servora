# Recovery and scope protection

1 November 2026. The original local `cleanup` worktree is based on `1859e159` and contains 908 status entries, including extensive pre-existing refactoring and SEO work. Those changes cannot safely be treated as redesign changes.

Before restoration, all 2,687 source/configuration files were archived in `tooling/recovery/before-market-redesign.zip` outside this working directory, alongside staged/unstaged binary patches, git status and SHA-256 hashes. The abandoned redesign is also recoverable on the separate remote branch `codex/servora-marketing-redesign`.

The new workspace is `servora-market-redesign`. Its website was restored from the pre-redesign checkpoint, then verified against GitHub cleanup commit `c1f18b883ad3fc4d9b8a09d63fcc5a1757700be0`: **104 of 104 tracked website blobs match, with no missing or mismatched files**. Generated build caches were excluded. The previous direction sheets, redesign report, asset generator and review workflow were excluded from the new baseline.

The original worktree, index, untracked files and all operational applications remain untouched. No reset, clean, force push, merge or production deployment was performed. The installed Taste skill is retained as a tool, with its previous design output discarded.

Only technical contracts, SEO machinery and working interactions may be migrated from this baseline. Its presentation and marketing copy are not research inputs. New work will be reviewed against the competitor research and the new design system.

A later workspace refresh removed the first temporary archive. A fresh source archive and staged/unstaged patches were created without changing the original worktree in `tooling/recovery/`: 2,524 source files, 4,515,646 bytes, SHA-256 `caace0fa7499990f1b122c4a34a9c51d027b83895bc8ec10908a7dcf9d86c1e9`. Credentials, generated directories and dependencies are excluded; existing environment files remain in the untouched original directory. The refreshed status has 849 records; no original worktree edits were made by this redesign. Remote branch checkpoints are the durable review/recovery anchors.
