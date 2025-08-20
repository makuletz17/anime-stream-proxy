export default async function handler(req, res) {
  const { url, referer } = req.query;

  if (!url) return res.status(400).send("Missing stream URL");

  const decodedUrl = decodeURIComponent(url);
  const ref = referer || "https://megaplay.buzz/";

  try {
    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: ref,
      },
    });

    if (!response.ok) {
      const errorText = await response.text(); // capture server's error message
      console.error("Stream fetch failed:", {
        status: response.status,
        statusText: response.statusText,
        url: decodedUrl,
        referer: ref,
        errorText,
      });

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

    // Handle .m3u8 playlist: rewrite .ts URLs to absolute proxy links
    if (decodedUrl.endsWith(".m3u8")) {
      const text = await response.text();

      const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf("/") + 1);

      const rewritten = text.replace(/^(.*\.ts)$/gm, (match) => {
        const absoluteUrl = new URL(match, baseUrl).toString();
        return `https://anime-stream-proxy-seven.vercel.app/api/proxy?url=${encodeURIComponent(
          absoluteUrl
        )}&referer=${encodeURIComponent(ref)}`;
      });

      res.status(200).send(rewritten);
    } else {
      // Stream .ts or other binary content
      const buffer = await response.arrayBuffer();
      res.status(200).send(Buffer.from(buffer));
    }
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy error: " + err.message);
  }
}
