# Claude Skills

Browse the [Claude Code](https://claude.com/claude-code) skills installed on your Mac, paste their slash commands into the app you are working in, share them, and delete the ones you no longer need.

The extension reads `~/.claude/skills`. It never creates or edits a skill — editing is left to your editor, so copying the folder path is all it offers for that.

## Actions

| Action | Shortcut | What it does |
| --- | --- | --- |
| Paste Slash Command | `Enter` | Pastes `/{skill-name}` into the frontmost app |
| Copy Slash Command | `Cmd+Enter` | Copies `/{skill-name}` |
| Copy Skill Path | `Cmd+Shift+C` | Copies the skill folder path (without `SKILL.md`) |
| Paste Skill Path | `Cmd+Shift+V` | Pastes the same path |
| Copy Skill Contents | `Cmd+Shift+F` | Copies the whole `SKILL.md`, frontmatter included |
| Paste Skill Contents | `Cmd+Opt+V` | Pastes the same contents |
| Export as Zip | `Cmd+Shift+E` | Writes the skill folder as a zip to the export folder |
| Copy Zip to Clipboard | `Cmd+Shift+Z` | Copies the zip as a file, ready to paste into Slack or an email |
| Delete Skill | `Ctrl+X` | Moves the skill folder to the Trash after a confirmation |

Deletion uses the Trash, so a mistake is recoverable from Finder. Zips are built with `ditto --keepParent`, so they expand back to `{skill-name}/SKILL.md`.

## Preferences

- **Claude Data Folder** — leave empty to use `CLAUDE_CONFIG_DIR`, or `~/.claude` when that is unset.
- **Zip Export Folder** — where `Export as Zip` writes the archive. Defaults to `~/Downloads`.

## Notes

A skill's name is its **folder name**, because that is what you type after `/`. When the `name` in the frontmatter differs from the folder name, the detail pane flags it.

Only user-scope skills (`~/.claude/skills`) are listed. Project-scope skills (`.claude/skills`) are not included yet.
