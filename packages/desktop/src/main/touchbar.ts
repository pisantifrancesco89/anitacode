import { BrowserWindow, TouchBar } from "electron"

const { TouchBarButton, TouchBarSpacer } = TouchBar

export function createTouchBar(mainWindow: BrowserWindow) {
  if (process.platform !== "darwin") return

  const newSession = new TouchBarButton({
    label: "✨ New Session",
    backgroundColor: "#6C5CE7",
    click: () => mainWindow.webContents.send("touchbar-command", "new-session"),
  })

  const approve = new TouchBarButton({
    label: "✓ Approve",
    backgroundColor: "#00B894",
    click: () => mainWindow.webContents.send("touchbar-command", "approve"),
  })

  const reject = new TouchBarButton({
    label: "✗ Reject",
    backgroundColor: "#E17055",
    click: () => mainWindow.webContents.send("touchbar-command", "reject"),
  })

  const spacer = new TouchBarSpacer({ size: "flexible" })

  mainWindow.setTouchBar(
    new TouchBar({
      items: [newSession, spacer, approve, reject],
    }),
  )
}
