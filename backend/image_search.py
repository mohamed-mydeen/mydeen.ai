import asyncio
import logging
from ddgs import DDGS
import wikipedia

import os
import httpx
from groq import AsyncGroq

logger = logging.getLogger(__name__)

# Initialize AI client for query optimization
GROQ_API_KEY = os.getenv("GEMINI_API_KEY")
ai_client = AsyncGroq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Cache dictionary to store image search results
_image_cache = {}

async def optimize_image_query(query: str) -> dict:
    """
    Uses AI to understand intent and optimize the search query.
    Returns: {"optimized_query": str, "category": str}
    Categories: 'diagram', 'person', 'place', 'general'
    """
    if not ai_client:
        return {"optimized_query": query, "category": "general"}

    prompt = f"""
    Analyze the user query: "{query}" for image search.
    
    1. CATEGORY: Classify into 'diagram', 'person', 'place', or 'general'.
    2. OPTIMIZED QUERY: Create a highly specific search query for accurate image results.
       - Person: Use full name + "official portrait" or "press photo".
       - Diagram: Use topic + "labeled anatomy diagram" or "scientific illustration".
       - Place: Use location name + "landscape" or "landmark architecture".
       - General: Use descriptive keywords.

    Return JSON format only: {{"category": "...", "optimized_query": "..."}}
    """
    try:
        response = await ai_client.chat.completions.create(
            messages=[{"role": "system", "content": "You are an expert image search optimizer."},
                      {"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0,
            response_format={"type": "json_object"}
        )
        import json
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logger.warning(f"Image query optimization failed: {e}")
        return {"optimized_query": query, "category": "general"}

async def fetch_images_for_query(query: str, max_results: int = 4) -> list:
    """
    Search for images across multiple free sources with AI-optimized queries.
    """
    # Normalize query for cache
    cache_key = query.strip().lower()
    if cache_key in _image_cache:
        logger.info(f"Returning cached images for query: {cache_key}")
        return _image_cache[cache_key]

    # 1. AI Optimization
    optimization = await optimize_image_query(query)
    search_q = optimization.get("optimized_query", query)
    category = optimization.get("category", "general")
    
    logger.info(f"[ImageSearch] Original='{query}' Optimized='{search_q}' Category='{category}'")

    results = []
    
    # 2. Wikipedia Search (High priority for People/Places/Diagrams)
    if category in ['person', 'place', 'diagram']:
        try:
            def search_wiki():
                try:
                    page = wikipedia.page(query, auto_suggest=True)
                    return page.images, page.url, page.title
                except:
                    return [], "", ""

            wiki_images, wiki_url, wiki_title = await asyncio.to_thread(search_wiki)
            # Filter for high quality extensions and relevant keywords in URL
            valid_images = [img for img in wiki_images if img.lower().endswith(('.jpg', '.jpeg', '.png'))]
            
            # Smart relevance check for Wikipedia images
            for img in valid_images:
                if len(results) >= max_results: break
                
                img_lower = img.lower()
                # Skip generic icons, flags (unless specifically asked), or small thumbnails
                if any(x in img_lower for x in ['icon', 'logo', 'flag', 'symbol', 'map_marker', 'edit-clear']):
                    continue
                
                results.append({
                    "url": img,
                    "thumbnail": img,
                    "title": f"{wiki_title} - Official Source",
                    "source": wiki_url,
                    "provider": "Wikipedia"
                })
        except Exception as e:
            logger.error(f"Wikipedia Image fetch failed: {e}")

    # 3. DuckDuckGo Images (Always run, uses optimized query)
    try:
        def search_ddg():
            with DDGS() as ddgs:
                # Use the optimized search query
                return list(ddgs.images(search_q, max_results=max_results * 2))
                
        ddg_results = await asyncio.to_thread(search_ddg)
        for res in ddg_results:
            if len(results) >= max_results + 2: break # Fetch a bit more to filter
            
            img_url = res.get("image")
            title = res.get("title", "")
            
            # Simple relevance filtering
            if not img_url or not any(word.lower() in title.lower() for word in search_q.split()):
                continue
            
            # Skip if already in results
            if any(r["url"] == img_url for r in results):
                continue

            results.append({
                "url": img_url,
                "thumbnail": res.get("thumbnail"),
                "title": title,
                "source": res.get("url", "DuckDuckGo"),
                "provider": res.get("source", "Web")
            })
    except Exception as e:
        logger.error(f"DDG Image search failed: {e}")

    # 4. Final Ranking/Filtering: Ensure we return the most relevant first
    # Wikipedia results are usually most authoritative for entities
    final_results = sorted(results, key=lambda x: 0 if x['provider'] == 'Wikipedia' else 1)
    
    _image_cache[cache_key] = final_results[:max_results]
    return final_results[:max_results]
