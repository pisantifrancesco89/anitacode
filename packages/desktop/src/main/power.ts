import { app, powerSaveBlocker } from "electron"

let blockerId: number | null = null

export function startPowerSaveBlocker() {
  if (blockerId !== null) return
  blockerId = powerSaveBlocker.start("prevent-app-suspension")
}

export function stopPowerSaveBlocker() {
  if (blockerId === null) return
  powerSaveBlocker.stop(blockerId)
  blockerId = null
}
