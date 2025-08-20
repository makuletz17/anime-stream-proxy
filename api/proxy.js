export default async function handler(req, res) {
  const { url, referer } = req.query;

  if (!url) return res.status(400).send("Missing stream URL");

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: referer || "https://megaplay.buzz/",
      },
    });

    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch stream");
    }

    // Stream response directly
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "application/vnd.apple.mpegurl"
    );

    // Pipe the response body directly
    const reader = response.body.getReader();
    const stream = new ReadableStream({
      start(controller) {
        function push() {
          reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
            push();
          });
        }
        push();
      },
    });

    new Response(stream).body.pipeTo(res);
  } catch (err) {
    res.status(500).send("Proxy error: " + err.message);
  }
}
