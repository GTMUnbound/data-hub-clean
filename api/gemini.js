// Using standard Node.js runtime for Vercel

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "Gemini API key not configured on server" });
  }

  try {
    // Vercel parses req.body automatically for application/json content-type
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Referer": "https://data-hub-clean.vercel.app/",
          "Origin": "https://data-hub-clean.vercel.app"
        },
        body: JSON.stringify(body),
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({ 
        error: data?.error?.message || "Gemini API error", 
        status: geminiRes.status 
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
