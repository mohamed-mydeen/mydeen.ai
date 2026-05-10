"""
jina_reader.py
Uses Jina AI Reader (r.jina.ai) — completely free, no API key needed.
Converts any URL into clean readable markdown text.
"""
import httpx
import logging

logger = logging.getLogger(__name__)

JINA_BASE = "https://r.jina.ai/"

async def extract_url_content(url: str, max_chars: int = 3000) -> dict:
    """
    Extract clean text from a URL using Jina Reader.
    Returns dict with title, content, url.
    """
    try:
        jina_url = f"{JINA_BASE}{url}"
        headers = {
            "Accept": "text/plain",
            "User-Agent": "Mozilla/5.0 (compatible; MydeenAI/1.0)",
            "X-Return-Format": "markdown",
        }

        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(jina_url, headers=headers)

            if resp.status_code == 200:
                content = resp.text.strip()

                # Extract title from first line if it starts with #
                lines = content.splitlines()
                title = url
                if lines and lines[0].startswith("#"):
                    title = lines[0].lstrip("#").strip()
                    content = "\n".join(lines[1:]).strip()

                # Truncate to avoid excessive token usage
                if len(content) > max_chars:
                    content = content[:max_chars] + "...[truncated]"

                return {
                    "title": title,
                    "url": url,
                    "content": content,
                    "source": "Jina Reader",
                    "success": True,
                }
            else:
                logger.warning(f"Jina Reader returned {resp.status_code} for {url}")
                return {"url": url, "content": "", "success": False}

    except Exception as e:
        logger.error(f"Jina Reader failed for {url}: {e}")
        return {"url": url, "content": "", "success": False, "error": str(e)}


async def extract_multiple_urls(urls: list[str], max_per_url: int = 2000) -> list[dict]:
    """Extract content from multiple URLs concurrently."""
    import asyncio
    tasks = [extract_url_content(url, max_per_url) for url in urls[:3]]  # limit to 3
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if isinstance(r, dict) and r.get("success")]
