#!/usr/bin/env bun
/**
 * Release script for AnitaCode (custom channel)
 *
 * Usage:
 *   bun run scripts/release-custom.ts           # patch bump (default)
 *   bun run scripts/release-custom.ts minor     # minor bump
 *   bun run scripts/release-custom.ts major     # major bump
 *   bun run scripts/release-custom.ts 1.2.3     # specific version
 *   bun run scripts/release-custom.ts --dry     # dry run (no build/publish)
 *
 * Requires:
 *   - gh CLI authenticated with write access to pisantifrancesco89/anitacode
 *   - Git remote "origin" pointing to the same repo
 *   - Run from the repository root
 */

import { $ } from "bun"
import { resolve } from "node:path"

const ROOT = resolve(import.meta.dirname, "../..")
// When running from repo root: bun run packages/desktop/scripts/release-custom.ts
const DESKTOP_DIR = resolve(import.meta.dirname, "..")
const PACKAGE_JSON = resolve(DESKTOP_DIR, "package.json")
const REPO = "pisantifrancesco89/anitacode"
const DRY_RUN = process.argv.includes("--dry")

function parseVersion(v: string) {
  const parts = v.split(".").map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) throw new Error(`Invalid version: ${v}`)
  return parts
}

function bump(current: string, type: string) {
  const [major, minor, patch] = parseVersion(current)
  const v = (() => {
    if (type === "major") return [major + 1, 0, 0]
    if (type === "minor") return [major, minor + 1, 0]
    if (type === "patch") return [major, minor, patch + 1]
    // Assume it's already a version string like "1.2.3"
    const custom = parseVersion(type)
    if (custom) return custom
    return [major, minor, patch + 1]
  })()
  return v.join(".")
}

function log(msg: string) {
  console.log(`[release] ${msg}`)
}

function step(msg: string) {
  console.log(`\n==> ${msg}`)
}

async function spawn(cmd: string, opts?: { cwd?: string; silent?: boolean }) {
  const proc = Bun.spawnSync(cmd.split(/\s+/), {
    cwd: opts?.cwd ?? ROOT,
    env: { ...process.env, OPENCODE_CHANNEL: "custom" },
  })
  if (proc.exitCode !== 0 && !opts?.silent) {
    console.error(proc.stderr.toString())
    throw new Error(`Command failed (exit ${proc.exitCode}): ${cmd}`)
  }
  return proc.stdout.toString().trim()
}

async function main() {
  // 1. Read current version
  const pkg = await Bun.file(PACKAGE_JSON).json()
  const currentVersion = pkg.version as string
  log(`Current version: ${currentVersion}`)

  // 2. Determine new version
  const bumpType = process.argv.slice(2).filter((a) => !a.startsWith("--")).at(0)
  const newVersion = bump(currentVersion, bumpType ?? "patch")
  log(`New version: ${newVersion}`)

  if (DRY_RUN) {
    log(`[dry-run] Would bump to ${newVersion}, build custom channel, and publish to ${REPO}`)
    return
  }

  // 3. Update package.json
  step("Updating package.json")
  pkg.version = newVersion
  await Bun.write(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + "\n")

  // 4. Build the desktop app
  step("Building desktop app (custom channel)")
  log("Running prebuild...")
  await spawn("bun run prebuild", { cwd: DESKTOP_DIR })
  log("Running build...")
  await spawn("bun run build", { cwd: DESKTOP_DIR })

  // 5. Package for current platform
  step("Packaging (macOS)")
  await spawn("bun run package:mac", { cwd: DESKTOP_DIR })

  // 6. List built artifacts
  const distDir = resolve(DESKTOP_DIR, "dist")
  const files = await spawn(`ls -lh ${distDir}`, { silent: true })
  log(`Artifacts:\n${files}`)

  // 7. Commit and tag
  step("Committing and tagging")
  const sha = (await spawn("git rev-parse HEAD")).trim()
  await spawn(`git add -- packages/desktop/package.json`)
  await spawn(`git commit -m "chore: bump version to ${newVersion}"`)
  await spawn(`git tag -f v${newVersion}`)

  // 8. Push
  step("Pushing to origin")
  await spawn("git push origin dev")
  await spawn(`git push origin -f v${newVersion}`)

  // 9. Create GitHub release (draft)
  step("Creating GitHub release")
  const tag = `v${newVersion}`
  await spawn(`gh release create ${tag} --title "${tag}" --target ${sha} --repo ${REPO}`)

  // 10. Upload artifacts
  step("Uploading artifacts to release")
  const patterns = ["*.dmg", "*.zip", "*.blockmap", "*.yml"]
  for (const pattern of patterns) {
    const glob = resolve(distDir, pattern)
    const listing = await spawn(`ls ${glob}`, { silent: true })
    if (!listing) continue
    const filesList = listing.split("\n").filter(Boolean)
    if (filesList.length > 0) {
      await spawn(`gh release upload ${tag} ${filesList.join(" ")} --clobber --repo ${REPO}`)
      log(`Uploaded ${filesList.length} file(s) matching ${pattern}`)
    }
  }

  log(`\n✅ Release ${tag} published to https://github.com/${REPO}/releases/tag/${tag}`)
  log(`Users will see the update notification on next app launch.`)
}

main().catch((err) => {
  console.error("[release] Failed:", err.message)
  process.exit(1)
})
