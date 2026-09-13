import * as fs from "fs"
import * as path from "path"

const SENSITIVE_PATTERNS = [
  /console\.log\(.*(password|secret|jwt|token|auth).*/gi,
  /console\.log\(.*process\.env.*/gi,
]

const NON_OPAQUE_ERROR_PATTERNS = [
  /not found/i,
  /wrong password/i,
  /invalid email/i,
  /already registered/i,
  /user does not exist/i,
]

const TARGET_DIRECTORIES = ["src", "scripts"]

function scanDirectory(dir: string, issues: string[]): void {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      scanDirectory(fullPath, issues)
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      const content = fs.readFileSync(fullPath, "utf-8")
      const lines = content.split("\n")

      lines.forEach((line, idx) => {
        // 1. Check for sensitive console.log statements
        SENSITIVE_PATTERNS.forEach((pattern) => {
          if (pattern.test(line)) {
            issues.push(`[SENSITIVE_LOG] ${fullPath}:${idx + 1} -> ${line.trim()}`)
          }
        })

        // 2. Check for non-opaque error messages in auth code
        if (fullPath.includes("auth") || fullPath.includes("login") || fullPath.includes("signup")) {
          NON_OPAQUE_ERROR_PATTERNS.forEach((pattern) => {
            if (pattern.test(line) && !line.includes("//") && !line.includes("GENERIC_")) {
              issues.push(`[NON_OPAQUE_ERROR] ${fullPath}:${idx + 1} -> ${line.trim()}`)
            }
          })
        }
      })
    }
  }
}

function runAudit() {
  console.log("🔍 Scanning codebase for sensitive logs and non-opaque error messages...")
  const issues: string[] = []
  const rootDir = process.cwd()

  TARGET_DIRECTORIES.forEach((dir) => {
    const fullDir = path.join(rootDir, dir)
    if (fs.existsSync(fullDir)) scanDirectory(fullDir, issues)
  })

  if (issues.length === 0) {
    console.log("✅ Codebase audit passed! No sensitive logs or non-opaque error messages found.")
  } else {
    console.warn(`⚠️ Found ${issues.length} potential security audit items:`)
    issues.forEach((issue) => console.warn(` - ${issue}`))
  }
}

runAudit()
