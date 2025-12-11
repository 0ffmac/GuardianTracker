// scripts/generate_oui_json.js
// Run with:  node scripts/generate_oui_json.js

const fs = require("fs");
const https = require("https");
const path = require("path");

const IEEE_OUI_URL = "https://standards-oui.ieee.org/oui/oui.txt";
const OUT_PATH = path.join(__dirname, "..", "src", "lib", "oui-vendors.json");

/**
 * Fetch URL text with redirect support
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        // Handle redirects
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return resolve(fetchUrl(res.headers.location));
        }

        if (res.statusCode !== 200) {
          return reject(
            new Error("Failed to fetch " + url + " (status " + res.statusCode + ")")
          );
        }

        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

/**
 * Parse IEEE OUI text into a mapping { OUI → vendor }
 */
function parseOUIText(text) {
  const map = {};
  const lines = text.split(/\r?\n/);

  const regexHex = /^([0-9A-Fa-f]{2}-[0-9A-Fa-f]{2}-[0-9A-Fa-f]{2})\s+\(hex\)\s+(.+)$/;
  const regexBase16 = /^([0-9A-Fa-f]{6})\s+\(base 16\)\s+(.+)$/;
  const regexShort = /^([0-9A-Fa-f]{6})\s+(.+)$/;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    let match =
      line.match(regexHex) ||
      line.match(regexBase16) ||
      null;

    if (match) {
      const key = match[1].replace(/-/g, "").toUpperCase();
      map[key] = match[2].trim();
      continue;
    }

    // Some variants have:  "001122 Some Vendor"
    match = line.match(regexShort);
    if (match) {
      const hex = match[1];
      if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
        map[hex.toUpperCase()] = match[2].trim();
      }
    }
  }

  return map;
}

(async () => {
  try {
    console.log("Downloading IEEE OUI file...");
    const text = await fetchUrl(IEEE_OUI_URL);

    console.log("Parsing OUI data...");
    const map = parseOUIText(text);

    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(map, null, 2), "utf8");

    console.log("✔ Saved", Object.keys(map).length, "entries to:");
    console.log("  " + OUT_PATH);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
})();
