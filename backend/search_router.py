"""
search_router.py
Intelligent search routing: decides which sources to query
based on the nature of the user's question.
"""
import re
import logging
import asyncio

from wikipedia_search import search_wikipedia
from search_ddg import search_duckduckgo
from jina_reader import extract_url_content
from image_search import fetch_images_for_query

logger = logging.getLogger(__name__)

# ── Keywords that signal a need for live/recent web data ──────────────────

LIVE_SEARCH_TRIGGERS = [
    # recency
    r"\b(latest|recent|current|now|today|tonight|this week|this month|this year)\b",
    r"\b(right now|at the moment|as of|up to date|updated)\b",
    r"\b(2024|2025|2026)\b",
    # news & events
    r"\b(news|breaking|trending|happening|event|update|announcement)\b",
    r"\b(just released|just launched|just announced)\b",
    # technology & products
    r"\b(new phone|new model|new version|new release|new feature|new app)\b",
    r"\b(iphone|galaxy|pixel|oneplus|snapdragon|apple|google|samsung|openai|gemini|chatgpt|gpt-?5)\b",
    r"\b(stock price|market|crypto|bitcoin|nifty|sensex|nasdaq)\b",
    # sports
    r"\b(ipl|cricket|football|match score|live score|standings|ranking)\b",
    r"\b(who won|who is winning|final score|results)\b",
    # weather
    r"\b(weather|temperature|forecast|rain|heatwave|cyclone)\b",
    # politics & government (these change frequently!)
    r"\b(chief minister|cm|prime minister|pm|president|minister|mp|mla|governor)\b",
    r"\b(election|voted|won|party|government|cabinet|appointed|resigned|replaced)\b",
    r"\b(who is the|who became|who will be|currently serving|current leader)\b",
]

WIKIPEDIA_TRIGGERS = [
    r"\b(who is|who was|what is|what was|explain|define|meaning of|history of)\b",
    r"\b(biography|born|died|founded|invented|discovered)\b",
    r"\b(capital of|president of|prime minister of|population of)\b",
    r"\b(theory|concept|formula|equation|law of)\b",
]

IMAGE_TRIGGERS = [
    r"\b(show|picture|photo|image|drawing|diagram|illustration|look like)\b",
    r"\b(landmark|monument|building|city|country|map)\b",
    r"\b(biology|anatomy|cell|animal|plant|flower|bird|fish|dinosaur)\b",
    r"\b(planet|galaxy|star|space|nebula)\b",
    r"\b(anatomy|skeleton|muscle|organ)\b",
    r"\b(who is|who was|biography|actor|actress|singer|athlete|politician|celebrity|person)\b"
]


def needs_web_search(query: str) -> bool:
    """Returns True if the query requires live web data."""
    q = query.lower()
    for pattern in LIVE_SEARCH_TRIGGERS:
        if re.search(pattern, q, re.IGNORECASE):
            return True
    return False


def needs_wikipedia(query: str) -> bool:
    """Returns True if Wikipedia is a good primary source for this query."""
    q = query.lower()
    for pattern in WIKIPEDIA_TRIGGERS:
        if re.search(pattern, q, re.IGNORECASE):
            return True
    return False

def needs_images(query: str) -> bool:
    """Returns True if images would enhance the response for this query."""
    q = query.lower()
    for pattern in IMAGE_TRIGGERS:
        if re.search(pattern, q, re.IGNORECASE):
            return True
    return False

async def route_and_search(query: str) -> dict:
    """
    Master search router: decides which sources to use,
    runs them, and returns structured context + sources.
    
    Returns:
        {
          "context": str,       # formatted text to inject into AI prompt
          "sources": list[dict] # list of {title, url, source}
          "searched": bool
        }
    """
    use_wiki = needs_wikipedia(query)
    use_ddg  = needs_web_search(query)
    use_img  = needs_images(query)

    # "who is" queries: always use BOTH Wikipedia AND DuckDuckGo
    # because Wikipedia may have stale cache but DDG gets fresh snippets
    if use_wiki and not use_ddg:
        use_ddg = True

    # If no triggers, skip search
    if not use_wiki and not use_ddg and not use_img:
        return {"context": "", "sources": [], "images": [], "searched": False}

    logger.info(f"[SearchRouter] query='{query[:60]}' wiki={use_wiki} ddg={use_ddg} img={use_img}")

    tasks = []
    labels = []

    if use_wiki:
        tasks.append(search_wikipedia(query, max_results=2))
        labels.append("wiki")

    if use_ddg:
        tasks.append(search_duckduckgo(query, max_results=4))
        labels.append("ddg")

    if use_img:
        tasks.append(fetch_images_for_query(query, max_results=4))
        labels.append("img")

    results_list = await asyncio.gather(*tasks, return_exceptions=True)

    wiki_results = []
    ddg_results  = []
    img_results  = []

    for label, result in zip(labels, results_list):
        if isinstance(result, Exception):
            logger.warning(f"[SearchRouter] {label} failed: {result}")
            continue
        if label == "wiki":
            wiki_results = result
        elif label == "ddg":
            ddg_results = result
        elif label == "img":
            img_results = result

    # ── Jina Reader: try multiple URLs, skip paywalled/blocked ones ──────
    jina_content = None
    NEWS_DOMAINS = ["ndtv", "timesofindia", "hindustantimes", "indiatoday",
                    "bbc", "reuters", "firstpost", "thewire", "scroll.in",
                    "thequint", "news18", "moneycontrol", "livemint",
                    "indiatvnews", "wionews", "zeenews", "aninews"]
    # Sites commonly paywalled or geo-blocked for Jina
    BLOCKED_DOMAINS = ["thehindu.com", "nytimes.com", "wsj.com", "ft.com",
                       "bloomberg.com", "economictimes.indiatimes.com",
                       "telegraphindia.com", "thepioneer.in"]

    def is_news_url(url: str) -> bool:
        return any(d in url.lower() for d in NEWS_DOMAINS)

    def is_likely_blocked(url: str) -> bool:
        return any(d in url.lower() for d in BLOCKED_DOMAINS)

    # Build candidate list: open news first, then others, skip blocked
    candidate_urls = []
    for r in ddg_results:
        url = r.get("url", "")
        if not url.startswith("http") or is_likely_blocked(url):
            continue
        if is_news_url(url):
            candidate_urls.insert(0, url)  # news first
        else:
            candidate_urls.append(url)

    # Fallback: use all DDG URLs if nothing passed filters
    if not candidate_urls:
        candidate_urls = [r.get("url", "") for r in ddg_results
                         if r.get("url", "").startswith("http")]

    # Try top 2 URLs in parallel for significantly faster responses
    if candidate_urls:
        jina_tasks = [extract_url_content(url, max_chars=2500) for url in candidate_urls[:2]]
        jina_results = await asyncio.gather(*jina_tasks, return_exceptions=True)
        for res in jina_results:
            if not isinstance(res, Exception) and res.get("success") and res.get("content"):
                jina_content = res
                break


    # ── Compile all sources ───────────────────────────────────────────────
    all_sources = []
    context_parts = []

    if wiki_results:
        context_parts.append("=== Wikipedia ===")
        for r in wiki_results:
            context_parts.append(f"[{r['title']}]\n{r['snippet']}")
            all_sources.append({"title": r["title"], "url": r["url"], "source": "Wikipedia"})

    if ddg_results:
        context_parts.append("\n=== Web Search Results ===")
        for r in ddg_results[:3]:
            context_parts.append(f"[{r['title']}]\n{r['snippet']}")
            all_sources.append({"title": r["title"], "url": r["url"], "source": "DuckDuckGo"})

    if jina_content and jina_content.get("success"):
        context_parts.append("\n=== Full Page Content ===")
        context_parts.append(f"[{jina_content.get('title', 'Web Page')}]\n{jina_content['content']}")
        # Update first DDG source with real title
        if all_sources:
            all_sources[len(wiki_results)]["title"] = jina_content.get("title", all_sources[len(wiki_results)]["title"])

    context = "\n\n".join(context_parts)
    return {
        "context": context,
        "sources": all_sources,
        "images": img_results,
        "searched": True,
    }
