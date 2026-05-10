"""
duckduckgo_search.py
Free DuckDuckGo search integration using their unofficial JSON API.
No API key required. Suitable for production use at moderate volume.
"""
import httpx
import logging
import re
import asyncio
from urllib.parse import unquote

logger = logging.getLogger(__name__)

DDG_INSTANT_API = "https://api.duckduckgo.com/"
DDG_HTML_SEARCH = "https://html.duckduckgo.com/html/"


async def search_duckduckgo(query: str, max_results: int = 5) -> list[dict]:
    """
    Search DuckDuckGo using Instant Answer API + HTML scrape in parallel.
    Always runs both methods for maximum freshness and combines results.
    """
    instant_results, html_results = await asyncio.gather(
        _ddg_instant(query, max_results),
        _scrape_ddg_html(query, max_results),
        return_exceptions=True
    )

    if isinstance(instant_results, Exception):
        instant_results = []
    if isinstance(html_results, Exception):
        html_results = []

    # Combine: HTML results first (fresher news), then instant API results
    seen_urls = set()
    combined = []
    for r in list(html_results) + list(instant_results):
        url = r.get("url", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            combined.append(r)

    return combined[:max_results]


async def _ddg_instant(query: str, max_results: int) -> list[dict]:
    """DuckDuckGo Instant Answer API — good for general facts."""
    results = []
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.get(DDG_INSTANT_API, params={
                "q": query,
                "format": "json",
                "no_html": "1",
                "skip_disambig": "1",
            })
            if resp.status_code != 200:
                return []
            data = resp.json()

            if data.get("AbstractText") and data.get("AbstractURL"):
                results.append({
                    "title": data.get("Heading", query),
                    "url": data.get("AbstractURL", ""),
                    "snippet": data["AbstractText"][:500],
                    "source": "DuckDuckGo",
                })

            for topic in data.get("RelatedTopics", [])[:max_results - len(results)]:
                if isinstance(topic, dict) and topic.get("Text") and topic.get("FirstURL"):
                    results.append({
                        "title": topic.get("Text", "")[:80],
                        "url": topic["FirstURL"],
                        "snippet": topic["Text"][:400],
                        "source": "DuckDuckGo",
                    })
    except Exception as e:
        logger.warning(f"DDG instant API failed: {e}")
    return results




async def _scrape_ddg_html(query: str, max_results: int, _client=None) -> list[dict]:
    """Fallback: scrape DuckDuckGo HTML results page."""
    results = []
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        }
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.post(
                DDG_HTML_SEARCH,
                data={"q": query, "b": "", "kl": ""},
                headers=headers,
            )
            if resp.status_code != 200:
                return []

            from bs4 import BeautifulSoup
            soup = BeautifulSoup(resp.text, "html.parser")
            result_divs = soup.select(".result")

            for div in result_divs[:max_results]:
                link_tag = div.select_one(".result__a")
                snippet_tag = div.select_one(".result__snippet")

                if link_tag and snippet_tag:
                    href = link_tag.get("href", "")
                    # DDG wraps links — decode percent-encoded real URL
                    url_match = re.search(r"uddg=([^&]+)", href)
                    if url_match:
                        real_url = unquote(url_match.group(1))
                    else:
                        real_url = href

                    # Skip DDG internal pages
                    if not real_url.startswith("http"):
                        continue

                    results.append({
                        "title": link_tag.get_text(strip=True),
                        "url": real_url,
                        "snippet": snippet_tag.get_text(strip=True)[:400],
                        "source": "DuckDuckGo",
                    })
    except Exception as e:
        logger.warning(f"DDG HTML fallback failed: {e}")

    return results
