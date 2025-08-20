import express from "express";
import fetch from "node-fetch";

const app = express();

app.get("/proxy", async (req, res) => {
  const { url, referer } = req.query;
  if (!url) return res.status(400).send("Missing stream URL");

  const decodedUrl = decodeURIComponent(url);
  const ref = referer || "https://megaplay.buzz/";

  try {
    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0 Safari/537.36",
        Referer: ref,
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        Connection: "keep-alive",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        message: "Failed to fetch stream",
        status: response.status,
        statusText: response.statusText,
        url: decodedUrl,
        referer: ref,
        errorText,
      });
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType);

    if (decodedUrl.endsWith(".m3u8")) {
      const text = await response.text();
      const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf("/") + 1);
      const rewritten = text.replace(/^(.*\.ts)$/gm, (match) => {
        const absoluteUrl = new URL(match, baseUrl).toString();
        return `${req.protocol}://${req.get(
          "host"
        )}/proxy?url=${encodeURIComponent(
          absoluteUrl
        )}&referer=${encodeURIComponent(ref)}`;
      });
      res.status(200).send(rewritten);
    } else {
      const buffer = await response.arrayBuffer();
      res.status(200).send(Buffer.from(buffer));
    }
  } catch (err) {
    res.status(500).send("Proxy error: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
