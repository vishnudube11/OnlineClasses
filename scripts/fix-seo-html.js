const fs = require("fs");
const path = require("path");

const TITLE =
  "OnlineClasses | Learn Java, AI & Programming in Your Language";
const file = path.join(__dirname, "..", "dist", "index.html");

if (!fs.existsSync(file)) {
  console.error("dist/index.html not found — run expo export first");
  process.exit(1);
}

let html = fs.readFileSync(file, "utf8");

html = html.replace(
  /<title\b[^>]*>\s*<\/title>/gi,
  `<title>${TITLE}</title>`
);

fs.writeFileSync(file, html);
console.log("Patched empty <title> tags in dist/index.html");
