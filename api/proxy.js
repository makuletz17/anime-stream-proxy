export default async function handler(req, res) {
  const { url, referer } = req.query;

  if (!url) {
    return res.status(400).send("Missing stream URL");
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: referer || "https://megaplay.buzz/", // fallback if none provided
      },
    });

    if (!response.ok) {
      return res.status(response.status);
    }

    const content = await response.text();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.status(200).send(content);
  } catch (err) {
    res.status(500).send("Proxy error: " + err.message);
  }
}
