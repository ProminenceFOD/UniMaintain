const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      results.push(file);
    }
  });
  return results;
}

const files = walk("src");

files.forEach((file) => {
  let content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  const seen = new Set();
  const newLines = [];
  let changed = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("import type { Role, Status, Priority, Category, User, AuditEntry, Request, Notification, Comment }") &&
      trimmed.includes("types")
    ) {
      if (seen.has(trimmed)) {
        // Skip duplicate
        changed = true;
        continue;
      } else {
        seen.add(trimmed);
      }
    }
    newLines.push(line);
  }

  if (changed) {
    fs.writeFileSync(file, newLines.join("\n"), "utf8");
    console.log(`Deduplicated type import in: ${file}`);
  }
});

console.log("Deduplication complete!");
