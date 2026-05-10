import asyncio
import logging
from ddgs import DDGS
import wikipedia

logger = logging.getLogger(__name__)

# Cache dictionary to store image search results
_image_cache = {}

async def fetch_images_for_query(query: str, max_results: int = 4) -> list:
    """
    Search for images across multiple free sources (DuckDuckGo, Wikipedia)
    and cache the results to improve performance.
    """
    # Normalize query for cache
    cache_key = query.strip().lower()
    if cache_key in _image_cache:
        logger.info(f"Returning cached images for query: {cache_key}")
        return _image_cache[cache_key]

    results = []
    
    # 1. Try DuckDuckGo Images first (It aggregates from many sources including Unsplash/Pixabay/etc)
    try:
        # Run synchronous DDGS in a thread pool to avoid blocking async event loop
        def search_ddg():
            with DDGS() as ddgs:
                return list(ddgs.images(query, max_results=max_results))
                
        ddg_results = await asyncio.to_thread(search_ddg)
        for res in ddg_results:
            results.append({
                "url": res.get("image"),
                "thumbnail": res.get("thumbnail"),
                "title": res.get("title", query),
                "source": res.get("url", "DuckDuckGo"),
                "provider": res.get("source", "DuckDuckGo")
            })
    except Exception as e:
        logger.error(f"DDG Image search failed for '{query}': {e}")

    # 2. Try Wikipedia as a fallback or addition if we need more images
    # Especially good for landmarks, biology, science concepts, people
    if len(results) < max_results:
        try:
            def search_wiki():
                # Get the page, but ignore disambiguation errors to avoid crashing
                try:
                    page = wikipedia.page(query, auto_suggest=True)
                    return page.images, page.url
                except wikipedia.exceptions.DisambiguationError as e:
                    # Pick the first option
                    page = wikipedia.page(e.options[0], auto_suggest=False)
                    return page.images, page.url
                except wikipedia.exceptions.PageError:
                    return [], ""

            wiki_images, wiki_url = await asyncio.to_thread(search_wiki)
            valid_images = [img for img in wiki_images if img.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
            
            for img in valid_images:
                if len(results) >= max_results:
                    break
                # Check if this image URL is already in results
                if not any(r["url"] == img for r in results):
                    results.append({
                        "url": img,
                        "thumbnail": img, # Wikipedia full images can be used as thumbnails
                        "title": f"{query} - Wikipedia",
                        "source": wiki_url,
                        "provider": "Wikipedia"
                    })
        except Exception as e:
            logger.error(f"Wikipedia Image search failed for '{query}': {e}")

    # Optional: Unsplash / Pixabay could be added here via API keys, 
    # but since DDGS inherently searches these sources on the open web, 
    # we get a good mix of free images.

    _image_cache[cache_key] = results[:max_results]
    return results[:max_results]
