// src/lib/macVendor.ts
// Uses the generated IEEE OUI vendor map in src/lib/oui-vendors.json
import ouiVendors from "./oui-vendors.json";
const OUI_VENDOR_MAP: Record<string, string> = ouiVendors as Record<string, string>;
/**
 * Normalize a MAC into the canonical 6-hex OUI key.
 * Examples:
 *  - '00:11:22:33:44:55' -> '001122'
 *  - '00-11-22' -> '001122'
 *  - '001122' -> '001122'
 */
function normalizeOUI(input?: string | null): string | null {
  if (!input) return null;
  const cleaned = input.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  if (cleaned.length < 6) return null;
  return cleaned.slice(0, 6);
}
/**
 * This is the function you already use in the API:
 *  - src/app/api/environment/devices/route.ts calls lookupManufacturerFromMac(...)
 */
export function lookupManufacturerFromMac(mac?: string | null): string | null {
  const key = normalizeOUI(mac);
  if (!key || key.length !== 6) return null;
  return OUI_VENDOR_MAP[key] ?? null;
}





// // Utility for looking up device vendor/manufacturer from a MAC address (Wi-Fi BSSID or BLE address).
// // NOTE: This ships with a minimal built-in map for now. For full coverage, replace OUI_VENDOR_MAP
// // with a generated dataset from the IEEE OUI list or another up-to-date source.

// // Map of 24-bit OUIs (first 3 bytes of MAC) to vendor names.
// // Keys are uppercase hex without separators, e.g. "A45E60".
// const OUI_VENDOR_MAP: Record<string, string> = {
//   // Examples only – extend/replace with a full dataset in your environment.
//   // Apple
//   "A45E60": "Apple, Inc.",
//   "F0D1A9": "Apple, Inc.",
//   // OPPO
//   "38F23E": "OPPO Electronics Corp.",
//   // Samsung
//   "30F70D": "Samsung Electronics Co.,Ltd",
// };

// function normalizeMac(mac?: string | null): string | null {
//   if (!mac) return null;
//   // Strip all non-hex characters (colons, dashes, spaces) and uppercase
//   const hex = mac.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
//   if (hex.length < 6) return null;
//   // First 3 bytes (6 hex chars) are the OUI
//   return hex.slice(0, 6);
// }

// /**
//  * Look up a human-readable manufacturer/vendor name from a MAC address.
//  * Returns null if the MAC is malformed or the OUI is unknown.
//  */
// export function lookupManufacturerFromMac(mac?: string | null): string | null {
//   const oui = normalizeMac(mac);
//   if (!oui) return null;
//   return OUI_VENDOR_MAP[oui] ?? null;
// }
