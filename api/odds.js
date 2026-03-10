// api/odds.js — Vercel Serverless Function
// Proxies requests to The Odds API, adding CORS headers so your frontend can call it freely.

export default async function handler(req, res) {
  // Allow requests from anywhere (lock this down to your domain in production)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { sport, markets, bookmakers } = req.query;

  if (!sport) {
    return res.status(400).json({ error: "Missing sport parameter" });
  }

  const API_KEY = process.env.ODDS_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: "ODDS_API_KEY environment variable not set" });
  }

  const params = new URLSearchParams({
    apiKey: API_KEY,
    regions: "us",
    oddsFormat: "decimal",
    markets: markets || "h2h,spreads,totals",
    ...(bookmakers && { bookmakers }),
  });

  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?${params}`;

  try {
    const response = await fetch(url);
    const remaining = response.headers.get("x-requests-remaining");
    const used = response.headers.get("x-requests-used");

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();

    // Forward quota headers to the frontend
    if (remaining) res.setHeader("x-requests-remaining", remaining);
    if (used) res.setHeader("x-requests-used", used);

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
