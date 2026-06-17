# Project Progress

## Completed
- ✅ Project analysis and structure understanding
- ✅ Tech stack identification
- ✅ Memory system setup
- ✅ Agent Builder zoom fix (wheel events)
- ✅ Agent Builder agent selection bug fix
- ✅ Team editing (context menu, editor panel, auto-assign)
- ✅ Memory Page (3-panel layout, categories, global/project scope)
- ✅ Memory sidebar button + Cmd+Shift+M shortcut
- ✅ Model filtering in Agent Builder (free + connected providers only)
- ✅ Native notification when update is ready to install
- ✅ Auto-install on app quit (no manual restart needed)
- ✅ Release script for custom channel (`bun run release:custom`)
- ✅ GitHub Actions workflow for automated releases
- ✅ Fix DEV badge: custom channel now maps to prod in Vite configs

## Current Status
- AnitaCode fork with all recent features committed on `dev` branch
- Auto-update fully implemented: checks on start + every 10 min, notification, auto-install on quit
- Can build installers with `OPENCODE_CHANNEL=custom`
- Release automation ready
- **v1.17.9 building** — fixes DEV badge in packaged app (custom channel now maps to prod in Vite configs)

## Next Steps
- Test v1.17.9: verify DEV badge is gone
- Test auto-update: v1.17.8 should receive v1.17.9 update notification
- Sign the app with Apple Developer Certificate for production
- Add Windows/Linux packaging for cross-platform releases

## Features Built
1. Agent Builder - Zoom fix, agent selection, team editing
2. Memory Page - Global and project memory files, 7 categories
3. Model Filtering - Free + connected providers only
4. Auto-Update - Native notification, auto-install on quit, release script + CI
