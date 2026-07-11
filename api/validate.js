// api/validate.js
// Vercel serverless function — validates license keys
// Keys are stored in Vercel environment variable REX_KEYS
// Format of REX_KEYS (set in Vercel dashboard):
// {"SOLO-A1B2":"SOLO","SOLO-C3D4":"SOLO","CREW-X9Y8":"CREW","CREW-Z7W6":"CREW"}

export default function handler(req, res) {

  // Only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ valid: false, message: "Method not allowed" });
  }

  // Get the key from request body
  const { key } = req.body || {};

  if (!key || typeof key !== "string") {
    return res.status(400).json({ valid: false, message: "No key provided" });
  }

  const k = key.trim().toUpperCase();

  // Load keys from environment variable
  let keyMap = {};
  try {
    keyMap = JSON.parse(process.env.REX_KEYS || "{}");
  } catch (e) {
    console.error("REX_KEYS parse error:", e);
    return res.status(500).json({ valid: false, message: "Server configuration error" });
  }

  // Check if key exists in the map
  const tier = keyMap[k];

  if (!tier) {
    return res.status(200).json({ valid: false, message: "Invalid license key" });
  }

  // Valid key — return tier
  return res.status(200).json({ valid: true, tier });
}
