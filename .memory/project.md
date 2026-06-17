# AnitaCode Project

## Stack
- Fork di OpenCode (SolidJS + TypeScript + Electron)
- UI: SolidJS con @solidjs/router
- State: SolidJS Store + @tanstack/solid-query
- Build: Vite + Bun

## Struttura
- `packages/app/` - SolidJS web UI
- `packages/desktop/` - Electron desktop app
- `packages/opencode/` - Backend Go

## Feature AnitaCode
1. **Agent Builder** - Pagina separata per gestire agenti (Cmd+Shift+A)
2. **Tasks Tab** - Pannello destro nella sessione per vedere i todo (Cmd+Shift+T)
3. **Kanban Board** - Pagina separata per gestione task (modalità completa)

## File Modificati
- `packages/app/src/pages/session/tasks-tab.tsx` - Nuovo componente TasksTab
- `packages/app/src/pages/session/session-side-panel.tsx` - Aggiunto tab Tasks
- `packages/app/src/pages/session/helpers.ts` - Gestione tab Tasks
- `packages/app/src/pages/layout.tsx` - Comandi e sidebar Tasks
