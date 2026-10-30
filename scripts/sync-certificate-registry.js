/**
 * Regenerates bundled certificate entries from assets/certificate/*.pdf
 * Run: node scripts/sync-certificate-registry.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const certDir = path.join(root, "assets", "certificate");
const outFile = path.join(root, "src", "certificates", "bundled.ts");

const pdfs = fs
  .readdirSync(certDir)
  .filter((name) => name.toLowerCase().endsWith(".pdf"))
  .map((name) => name.replace(/\.pdf$/i, ""))
  .sort();

const lines = pdfs.map(
  (id) => `  ${JSON.stringify(id)}: require("../../assets/certificate/${id}.pdf"),`,
);

const content = `/** Auto-generated — run \`node scripts/sync-certificate-registry.js\` after adding PDFs. */
export const BUNDLED_CERTIFICATES: Record<string, number> = {
${lines.join("\n")}
};
`;

fs.writeFileSync(outFile, content);
console.log(`Registered ${pdfs.length} certificate(s): ${pdfs.join(", ")}`);
