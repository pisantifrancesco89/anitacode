#!/usr/bin/env bun
/**
 * Ad-hoc codesign script for AnitaCode (custom channel)
 *
 * Signs the macOS app bundle with an ad-hoc identity ("-") so macOS
 * Gatekeeper no longer reports the app as "damaged".  Users will
 * still see an "unverified developer" warning on first launch, which
 * they can bypass by right-clicking → Open.
 *
 * This script is a no-op on non-macOS platforms.
 *
 * Usage:
 *   bun run scripts/sign-adhoc.ts [dist-dir]
 *
 * If [dist-dir] is omitted it defaults to packages/desktop/dist.
 */
import { execSync } from "node:child_process"
import { existsSync, readdirSync } from "node:fs"
import { resolve } from "node:path"

const DESKTOP_DIR = resolve(import.meta.dirname, "..")
const DEFAULT_DIST = resolve(DESKTOP_DIR, "dist")

const distDir = resolve(process.argv[2] ?? DEFAULT_DIST)

if (process.platform !== "darwin") {
  console.log("[sign-adhoc] Skipping on non-macOS platform")
  process.exit(0)
}

// Find all .app bundles inside the dist directory (electron-builder places
// them in subdirectories like dist/mac-arm64/ or dist/mac/)
const entries = existsSync(distDir) ? readdirSync(distDir) : []
const appBundles: string[] = []
for (const entry of entries) {
  if (entry.endsWith(".app")) {
    appBundles.push(entry)
    continue
  }
  // Scan subdirectories (mac-arm64, mac, etc.) for .app bundles
  const subdir = resolve(distDir, entry)
  try {
    const subEntries = readdirSync(subdir)
    for (const subEntry of subEntries) {
      if (subEntry.endsWith(".app")) appBundles.push(`${entry}/${subEntry}`)
    }
  } catch {
    // Not a directory or not readable — skip
  }
}

if (appBundles.length === 0) {
  console.log(`[sign-adhoc] No .app bundles found in ${distDir}`)
  process.exit(0)
}

const entitlementsPath = resolve(DESKTOP_DIR, "resources", "entitlements.plist")

for (const bundle of appBundles) {
  const appPath = resolve(distDir, bundle)
  console.log(`[sign-adhoc] Signing ${appPath}`)

  // Sign all frameworks and helpers first (deep signing)
  // --force replaces any existing signature
  // --sign - uses ad-hoc identity
  // --options runtime enables hardened runtime
  // --entitlements applies the entitlements plist
  try {
    execSync(
      `codesign --force --deep --sign - --options runtime --entitlements "${entitlementsPath}" "${appPath}"`,
      { stdio: "inherit" },
    )
    console.log(`[sign-adhoc] ✅ Signed ${bundle}`)
  } catch (err) {
    console.error(`[sign-adhoc] ❌ Failed to sign ${bundle}:`, err)
    process.exit(1)
  }

  // Verify the signature
  try {
    execSync(`codesign --verify --verbose=2 "${appPath}"`, { stdio: "inherit" })
    console.log(`[sign-adhoc] ✅ Verified ${bundle}`)
  } catch (err) {
    console.error(`[sign-adhoc] ❌ Verification failed for ${bundle}:`, err)
    process.exit(1)
  }
}

console.log(`[sign-adhoc] Done — signed ${appBundles.length} bundle(s)`)