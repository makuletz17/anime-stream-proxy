from flask import Flask, request, Response
import cloudscraper
import urllib.parse

app = Flask(__name__)
scraper = cloudscraper.create_scraper()


@app.route("/")
def home():
    return "✅ Proxy is running! Use /proxy?url=&referer="


@app.route("/proxy")
def proxy():
    url = request.args.get("url")
    referer = request.args.get("referer", "https://megaplay.buzz/")

    if not url:
        return "Missing url parameter", 400

    decoded_url = urllib.parse.unquote(url)
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": referer,
    }

    try:
        resp = scraper.get(decoded_url, headers=headers, stream=True)
        content_type = resp.headers.get("Content-Type", "")

        # ✅ Handle m3u8 playlists
        if "application/vnd.apple.mpegurl" in content_type or decoded_url.endswith(
                ".m3u8"):
            text = resp.text
            base_url = decoded_url.rsplit("/", 1)[0] + "/"

            def rewrite_line(line: str):
                line = line.strip()
                if not line or line.startswith("#"):  # leave directives intact
                    return line
                # Build absolute URL
                absolute_url = urllib.parse.urljoin(base_url, line)
                # Rewrite via proxy
                base_proxy = request.url_root.rstrip("/")
                proxied = f"{base_proxy}/proxy?url={urllib.parse.quote(absolute_url)}&referer={urllib.parse.quote(referer)}"
                return proxied

            rewritten = "\n".join(rewrite_line(l) for l in text.splitlines())

            return Response(rewritten,
                            headers={
                                "Content-Type":
                                "application/vnd.apple.mpegurl",
                                "Cache-Control": "no-cache"
                            })

        # ✅ WebVTT handler
        if "text/vtt" in content_type or decoded_url.endswith(".vtt"):
            vtt_text = resp.text
            return Response(vtt_text,
                            headers={
                                "Content-Type": "text/vtt; charset=UTF-8",
                                "Cache-Control": "no-cache"
                            })

        # ✅ Otherwise (TS segments, MP4, images, etc.)
        def generate():
            for chunk in resp.iter_content(chunk_size=8192):
                if chunk:
                    yield chunk

        return Response(generate(),
                        headers={
                            "Content-Type": content_type or "video/mp2t",
                            "Cache-Control": "no-cache"
                        })

    except Exception as e:
        return f"Proxy error: {str(e)}", 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
