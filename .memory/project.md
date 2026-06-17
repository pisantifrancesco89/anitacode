# AnitaCode Project

## Stack
- Fork di OpenCode (SolidJS + TypeScript + Electron)
- UI: SolidJS con @solidjs/router
- State: SolidJS Store + @tanstack/solid-query
- Build: Vite + Bun, Electron-Builder

## Struttura
- `packages/app/` - SolidJS web UI
- `packages/desktop/` - Electron desktop app
- `packages/desktop/src/main/` - Main process (Electron)
- `packages/desktop/src/preload/` - Preload scripts
- `packages/opencode/` - Backend Go (sidecar CLI)
- `.github/workflows/` - CI/CD workflows

## Feature AnitaCode
1. **Agent Builder** - Pagina separata per gestire agenti (Cmd+Shift+A)
   - Canvas zoom con wheel events, team editing con context menu
2. **Memory Page** - Memoria persistente globale e per progetto
   - 3 pannelli, 7 categorie, scope All/Global/Project, Cmd+Shift+M
3. **Model Filtering** - Mostra solo modelli free + provider connessi
4. **Auto-Update** - Electron-updater con notifica nativa e auto-install su quit

## Auto-Update System
- Check all'avvio e ogni 10 minuti
- Notifica nativa macOS quando update pronto (click per installare)
- Auto-install alla chiusura dell'app
- Release script: `bun run release:custom` (patch/minor/major)
- GitHub Actions: `.github/workflows/release-anitacode.yml`
- Pubblica su GitHub Releases → electron-updater rileva automaticamente

## File Modificati
- `packages/app/src/pages/session/tasks-tab.tsx` - Nuovo componente TasksTab
- `packages/app/src/pages/session/session-side-panel.tsx` - Aggiunto tab Tasks
- `packages/app/src/pages/session/helpers.ts` - Gestione tab Tasks
- `packages/app/src/pages/layout.tsx` - Comandi e sidebar Tasks
- `packages/app/src/pages/agents/agent-canvas.tsx` - Canvas zoom + teams
- `packages/app/src/pages/agents/agent-editor.tsx` - Modello dropdown filter
- `packages/app/src/pages/agents/index.tsx` - Model filtering logic
- `packages/app/src/pages/memory/` - Memory page (index, service, types)
- `packages/desktop/src/main/updater.ts` - Auto-update + notification + quit handler
- `packages/desktop/scripts/release-custom.ts` - Release script
- `.github/workflows/release-anitacode.yml` - CI/CD workflow
