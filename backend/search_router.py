"""
search_router.py
Intelligent search routing: decides which sources to query
based on the nature of the user's question.
"""
import re
import logging
import asyncio

import os
from groq import AsyncGroq
from wikipedia_search import search_wikipedia
from search_ddg import search_duckduckgo
from jina_reader import extract_url_content
from image_search import fetch_images_for_query

logger = logging.getLogger(__name__)

# Initialize a separate client for the classifier to avoid circular imports
GROQ_API_KEY = os.getenv("GEMINI_API_KEY") # Shared key
classifier_client = AsyncGroq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# ── Simple Search Cache ────────────────────────────────────────────────
SEARCH_CACHE = {} # {query: {"results": result, "timestamp": time}}
CACHE_TTL = 3600 # 1 hour

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

async def classify_search_intent(query: str) -> str:
    """
    Uses a fast LLM to classify if the query MUST SEARCH or NO SEARCH.
    Returns: 'MUST_SEARCH' or 'NO_SEARCH'
    """
    if not classifier_client:
        return "MUST_SEARCH" if needs_web_search(query) else "NO_SEARCH"

    prompt = f"""
    Classify the following user query into 'MUST_SEARCH' or 'NO_SEARCH'.

    MUST_SEARCH if the query is about:
    - current information (today, now, latest news)
    - recent events (2024, 2025, 2026)
    - political office holders (CM, PM, President, etc.)
    - changing facts (stock prices, crypto, sports scores)
    - tech releases (new gadgets, AI updates)
    - live public facts (weather, trending topics)

    NO_SEARCH if the query is about:
    - coding help (C++, Python, React, etc.)
    - programming logic, algorithms, math
    - grammar, explanations of concepts
    - educational/academic definitions
    - logic puzzles, philosophical questions
    - casual conversation or follow-ups

    User Query: "{query}"

    Return ONLY 'MUST_SEARCH' or 'NO_SEARCH'.
    """
    try:
        response = await classifier_client.chat.completions.create(
            messages=[{"role": "system", "content": "You are a smart query classifier."},
                      {"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0,
            max_tokens=10
        )
        decision = response.choices[0].message.content.strip().upper()
        return "MUST_SEARCH" if "MUST_SEARCH" in decision else "NO_SEARCH"
    except Exception as e:
        logger.warning(f"Intent classification failed: {e}")
        # Fallback to regex
        return "MUST_SEARCH" if needs_web_search(query) or needs_wikipedia(query) else "NO_SEARCH"


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

async def route_and_search(query: str, force: bool = False) -> dict:
    """
    Master search router: decides which sources to use,
    runs them, and returns structured context + sources.
    """
    # Check cache first
    import time
    cache_key = query.lower().strip()
    if cache_key in SEARCH_CACHE:
        entry = SEARCH_CACHE[cache_key]
        if time.time() - entry["timestamp"] < CACHE_TTL:
            logger.info(f"[SearchRouter] Cache hit for: {cache_key}")
            return entry["results"]

    # AI Classification
    intent = "MUST_SEARCH" if force else await classify_search_intent(query)
    use_img = needs_images(query)
    
    # If no search needed and no images requested, skip
    if intent == "NO_SEARCH" and not use_img:
        return {"context": "", "sources": [], "images": [], "searched": False}

    use_wiki = needs_wikipedia(query) or intent == "MUST_SEARCH"
    use_ddg  = intent == "MUST_SEARCH" or use_wiki

    logger.info(f"[SearchRouter] query='{query[:60]}' intent={intent} wiki={use_wiki} ddg={use_ddg} img={use_img}")

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
    final_result = {
        "context": context,
        "sources": all_sources,
        "images": img_results,
        "searched": True,
    }
    
    # Cache the result
    if all_sources or img_results:
        SEARCH_CACHE[cache_key] = {
            "results": final_result,
            "timestamp": time.time()
        }
        
    return final_result
