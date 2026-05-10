"""
wikipedia_search.py
Free Wikipedia API integration for factual/general topic searches.
"""
import httpx
import logging

logger = logging.getLogger(__name__)

WIKI_API = "https://en.wikipedia.org/api/rest_v1"
WIKI_SEARCH_API = "https://en.wikipedia.org/w/api.php"
WIKI_HEADERS = {
    "User-Agent": "MydeenAI/1.0 (https://mydeen.vercel.app; educational chatbot) python-httpx",
    "Accept": "application/json",
}

async def search_wikipedia(query: str, max_results: int = 3) -> list[dict]:
    """Search Wikipedia and return top results with summaries."""
    results = []
    try:
        async with httpx.AsyncClient(timeout=8.0, headers=WIKI_HEADERS) as client:
            # Step 1: search for article titles
            search_resp = await client.get(WIKI_SEARCH_API, params={
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srlimit": max_results,
                "format": "json",
                "origin": "*",
            })
            if search_resp.status_code != 200:
                return []

            articles = search_resp.json().get("query", {}).get("search", [])

            # Step 2: fetch summary for each article
            for article in articles[:max_results]:
                title = article.get("title", "")
                try:
                    summary_resp = await client.get(
                        f"{WIKI_API}/page/summary/{httpx.URL(title)}",
                        headers={"Accept": "application/json"}
                    )
                    if summary_resp.status_code == 200:
                        data = summary_resp.json()
                        results.append({
                            "title": data.get("title", title),
                            "url": data.get("content_urls", {}).get("desktop", {}).get("page", f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"),
                            "snippet": data.get("extract", "")[:600],
                            "source": "Wikipedia",
                        })
                except Exception as e:
                    logger.warning(f"Failed to fetch Wikipedia summary for '{title}': {e}")
    except Exception as e:
        logger.error(f"Wikipedia search failed: {e}")

    return results
