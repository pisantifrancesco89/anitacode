# AnitaCode — Piano di Sviluppo

Fork personalizzato di [OpenCode](https://github.com/anomalyco/opencode) per macOS con dashboard avanzata.

---

## Panoramica

AnitaCode è un fork dell'app desktop Mac di OpenCode con:

- **6 feature macOS native**: badge dock, login item, power management, Touch Bar, Handoff, multi-finestra
- **Agent Builder UI**: editor grafico, albero gerarchico dei subagenti, assegnazione modelli per agente
- **Kanban Board**: drag-and-drop per gestione task cross-session
- **Rebranding completo**: nome, icone, canale di build custom

---

## Architettura

```
anomalyco/opencode (upstream)
    └── fork → <username>/opencode
            └── branch: dev
                ├── packages/desktop/     ← Electron 42, electron-builder
                │   ├── src/main/         ← Processo principale
                │   ├── src/preload/      ← Preload scripts
                │   ├── src/renderer/     ← Renderer UI
                │   ├── icons/custom/     ← NUOVO: icone AnitaCode
                │   └── resources/        ← Entitlements macOS
                ├── packages/app/         ← SolidJS web UI
                │   ├── src/pages/agents/  ← NUOVO: Agent Builder
                │   ├── src/pages/kanban/  ← NUOVO: Kanban Board
                │   ├── src/components/agent-tree.tsx  ← NUOVO
                │   └── src/components/sidebar.tsx      ← MODIFICATO
                └── ANITACODE_PLAN.md     ← QUESTO FILE
```

---

## Fase 1 — Setup e Rebranding (1-2 ore)

### 1.1 Fork e Clone
```bash
# Fork su GitHub (manuale)
git clone git@github.com:<username>/opencode.git anitacode
cd anitacode
git remote add upstream https://github.com/anomalyco/opencode.git
bun install
```

### 1.2 Canale Custom in electron-builder
File: `packages/desktop/electron-builder.config.ts`

Aggiungere il canale `custom` accanto a dev/beta/prod:
```typescript
// Configurazione canale custom per AnitaCode
{
  appId: "ai.anitacode.opencode",
  productName: "AnitaCode",
  channel: "custom",
  // ...eredita il resto dalla config macOS esistente
}
```

### 1.3 Icone Custom
Directory: `packages/desktop/icons/custom/`
- `icon.icns` — icona app macOS
- `dock.png` — icona dock
- `icon.ico` — icona Windows

### 1.4 Verifica Build
```bash
bun run --cwd packages/desktop build
bun run --cwd packages/desktop package:mac
```

---

## Fase 2 — Feature macOS Native (2-3 giorni)

### 2.1 Dock Badge (`packages/desktop/src/main/ipc.ts`)
```typescript
// IPC handler per aggiornare badge dock
ipcMain.handle("set-dock-badge", (_event, count: number) => {
  if (process.platform === "darwin" && app.dock) {
    app.dock.setBadge(count > 0 ? String(count) : "")
  }
})

ipcMain.handle("get-dock-badge", () => {
  if (process.platform === "darwin" && app.dock) {
    return app.dock.getBadge()
  }
  return ""
})
```

### 2.2 Login Item (`packages/desktop/src/main/index.ts`)
```typescript
app.setLoginItemSettings({
  openAtLogin: false,  // default, toggle via IPC
  path: process.execPath,
})

// IPC handlers
ipcMain.handle("get-login-item-settings", () => {
  return app.getLoginItemSettings()
})

ipcMain.handle("set-login-item-settings", (_event, settings) => {
  app.setLoginItemSettings(settings)
})
```

### 2.3 Power Management (`packages/desktop/src/main/power.ts`)
```typescript
let powerSaveBlockerId: number | null = null

export function startPowerSaveBlocker() {
  if (powerSaveBlockerId !== null) return
  powerSaveBlockerId = powerSaveBlocker.start("prevent-app-suspension")
}

export function stopPowerSaveBlocker() {
  if (powerSaveBlockerId === null) return
  powerSaveBlocker.stop(powerSaveBlockerId)
  powerSaveBlockerId = null
}

ipcMain.handle("start-power-save", () => startPowerSaveBlocker())
ipcMain.handle("stop-power-save", () => stopPowerSaveBlocker())
```

### 2.4 Touch Bar (`packages/desktop/src/main/touchbar.ts`)
```typescript
import { TouchBar, nativeImage } from "electron"

const { TouchBarButton, TouchBarSpacer } = TouchBar

export function createTouchBar(mainWindow: BrowserWindow): TouchBar {
  const newSessionBtn = new TouchBarButton({
    label: "New Session",
    backgroundColor: "#6C5CE7",
    click: () => mainWindow.webContents.send("touchbar-command", "new-session"),
  })

  const approveBtn = new TouchBarButton({
    label: "Approve",
    backgroundColor: "#00B894",
    click: () => mainWindow.webContents.send("touchbar-command", "approve"),
  })

  const rejectBtn = new TouchBarButton({
    label: "Reject",
    backgroundColor: "#E17055",
    click: () => mainWindow.webContents.send("touchbar-command", "reject"),
  })

  return new TouchBar({
    items: [newSessionBtn, new TouchBarSpacer({ size: "flexible" }), approveBtn, rejectBtn],
  })
}
```

### 2.5 Handoff / Continuity (`packages/desktop/src/main/index.ts`)
```typescript
import { app } from "electron"

app.setAsDefaultProtocolClient("anitacode")

app.on("open-url", (event, url) => {
  event.preventDefault()
  handleDeepLink(url)
})

// NSUserActivity via Electron
app.on("continue-activity", (event, type, userInfo) => {
  if (type === "NSUserActivityTypeBrowsingWeb") {
    // Riprendi stato da altro dispositivo Apple
  }
})

app.on("update-activity-state", (event, type, userInfo) => {
  if (type === "ai.anitacode.session") {
    // Aggiorna activity state con sessionID corrente
  }
})
```

### 2.6 Multi-Finestra (`packages/desktop/src/main/windows.ts`)
```typescript
const windows = new Map<string, BrowserWindow>()

export function createWindow(id: string): BrowserWindow {
  const existing = windows.get(id)
  if (existing) {
    existing.focus()
    return existing
  }

  const win = createMainWindow() // refactored
  windows.set(id, win)

  win.on("closed", () => windows.delete(id))

  return win
}

ipcMain.handle("create-window", (_event, id: string) => {
  createWindow(id)
})

ipcMain.handle("get-window-count", () => windows.size)
```

---

## Fase 3 — Agent Builder UI (7-10 giorni)

### 3.1 Editor Agenti (`packages/app/src/pages/agents/`)
- Nuovo pannello con form per creare/modificare agenti
- Campi: nome, descrizione, modalità (primary/subagent/all), modello, temperatura, top_p, maxSteps, permessi, tools, system prompt, colore
- Scrive i file `agents/*.md` con YAML frontmatter
- Aggiorna la sezione `agent` in `opencode.jsonc` per l'assegnazione modello

### 3.2 Albero Gerarchico (`packages/app/src/components/agent-tree.tsx`)
- Libreria: D3.js per force-directed tree
- Nodo radice: agente primary (orchestrator)
- Nodi figli: subagenti
- Stato live per ogni agente
- Click per aprire editor dettaglio

### 3.3 Assegnazione Modelli
- Dropdown con provider configurati e rispettivi modelli
- Supporto `small_model` per fallback

### 3.4 API necessarie (sidecar server)
```
GET  /api/agents              — lista agenti con stato
POST /api/agents              — crea nuovo agente
PUT  /api/agents/:name        — modifica agente
DELETE /api/agents/:name      — elimina agente
GET  /api/agents/:name/status — stato runtime
GET  /api/providers/models    — modelli disponibili per provider
```

---

## Fase 4 — Kanban Board (4-6 giorni)

### 4.1 Nuova Pagina Kanban (`packages/app/src/pages/kanban/`)
- Colonne: todo / in_progress / review / done / cancelled
- Drag-and-drop tra colonne con @dnd-kit (adattato per SolidJS)
- Card con titolo, agente assegnato, priorità, data

### 4.2 Estensione Dati
- Tabella `task` globale (non solo session-scoped) in SQLite
- Campi: id, title, description, status, priority, agent_name, project_id, session_id, time_created, time_updated

### 4.3 API REST
```
GET    /api/tasks                     — lista task con filtri
POST   /api/tasks                     — crea task
PUT    /api/tasks/:id                 — modifica task
DELETE /api/tasks/:id                 — elimina task
PATCH  /api/tasks/:id/status          — cambia stato (drag-drop)
GET    /api/tasks/project/:projectId  — task per progetto
```

### 4.4 Filtri
- Per agente
- Per progetto
- Per priorità (high/medium/low)
- Per stato

---

## Fase 5 — Integrazione Sidebar e Menu (2-3 giorni)

### 5.1 Sidebar (`packages/app/src/components/sidebar.tsx`)
- Nuove voci: "Agents" (icona robot), "Kanban" (icona board)
- Navigazione con Solid Router

### 5.2 Menu macOS (`packages/desktop/src/main/menu.ts`)
- Aggiungere voci: AnitaCode > Agents, AnitaCode > Kanban Board
- Shortcut: Cmd+Shift+A (Agents), Cmd+Shift+K (Kanban)

### 5.3 IPC Handlers
```typescript
ipcMain.handle("agent:create", handler)
ipcMain.handle("agent:update", handler)
ipcMain.handle("agent:delete", handler)
ipcMain.handle("agent:list", handler)
ipcMain.handle("agent:set-model", handler)
ipcMain.handle("task:create", handler)
ipcMain.handle("task:update", handler)
ipcMain.handle("task:move", handler)
ipcMain.handle("task:list", handler)
```

---

## Fase 6 — Build e Test (1-2 giorni)

### 6.1 Build Finale
```bash
OPENCODE_CHANNEL=custom bun run --cwd packages/desktop build
OPENCODE_CHANNEL=custom bun run --cwd packages/desktop package:mac
```
Output: `packages/desktop/dist/anitacode-desktop-mac-arm64.dmg`

### 6.2 Test
```bash
# Unit test
bun run --cwd packages/desktop test

# Build test
bun run --cwd packages/desktop build

# Type check
bun run --cwd packages/desktop typecheck
```

### 6.3 Notarization (opzionale, richiede Apple Developer)
- Configurare `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`
- electron-builder gestisce notarization automatica con `notarize: true`

---

## Riepilogo

### File Creati/Modificati

| File | Azione |
|------|--------|
| `ANITACODE_PLAN.md` | Nuovo (documentazione) |
| `packages/desktop/electron-builder.config.ts` | Modificato (canale custom) |
| `packages/desktop/icons/custom/*` | Nuovo (icone) |
| `packages/desktop/src/main/ipc.ts` | Modificato (badge, login, power) |
| `packages/desktop/src/main/power.ts` | Nuovo (power management) |
| `packages/desktop/src/main/touchbar.ts` | Nuovo (Touch Bar) |
| `packages/desktop/src/main/index.ts` | Modificato (handoff, login item) |
| `packages/desktop/src/main/windows.ts` | Modificato (multi-finestra) |
| `packages/desktop/src/main/menu.ts` | Modificato (nuove voci) |
| `packages/desktop/src/preload/index.ts` | Modificato (nuovi IPC) |
| `packages/app/src/pages/agents/` | Nuovo (Agent Builder) |
| `packages/app/src/pages/kanban/` | Nuovo (Kanban Board) |
| `packages/app/src/components/agent-tree.tsx` | Nuovo (Tree) |
| `packages/app/src/components/sidebar.tsx` | Modificato (nuove voci) |

### Timeline

| Fase | Tempo |
|------|-------|
| 1. Setup | 1-2 ore |
| 2. macOS Features | 2-3 giorni |
| 3. Agent Builder | 7-10 giorni |
| 4. Kanban Board | 4-6 giorni |
| 5. Integrazione | 2-3 giorni |
| 6. Build e Test | 1-2 giorni |
| **Totale** | **~3-4 settimane** |
