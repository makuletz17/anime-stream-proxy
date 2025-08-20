import fetch from "node-fetch";

export default async function handler(req, res) {
  const { url, referer } = req.query;

  if (!url) return res.status(400).send("Missing stream URL");

  const decodedUrl = decodeURIComponent(url);

  try {
    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: referer || "https://megaplay.buzz/",
      },
    });

    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch stream");
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType);

    // Handle .m3u8 playlist: rewrite .ts URLs to go through proxy
    if (decodedUrl.endsWith(".m3u8")) {
      const text = await response.text();
      const rewritten = text.replace(/(.*\.ts)/g, (match) => {
        const absoluteUrl = new URL(match, decodedUrl).toString();
        return `/api/proxy?url=${encodeURIComponent(
          absoluteUrl
        )}&referer=${encodeURIComponent(referer || "https://megaplay.buzz/")}`;
      });
      res.status(200).send(rewritten);
    } else {
      // Stream .ts or other binary content
      const buffer = await response.buffer();
      res.status(200).send(buffer);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Proxy error: " + err.message);
  }
}
