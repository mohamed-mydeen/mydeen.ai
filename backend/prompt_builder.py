"""
prompt_builder.py
Builds the final AI prompt by injecting live web search context
into the conversation, making the AI response grounded in real data.
"""

def build_search_aware_prompt(
    system_prompt: str,
    user_query: str,
    search_context: str,
    sources: list[dict],
    images: list[dict] = None,
) -> list[dict]:
    """
    Injects retrieved web context into the system prompt so the AI
    uses live information instead of only its training data.

    Returns a list of messages in OpenAI/Groq format.
    """
    if not search_context:
        return [{"role": "system", "content": system_prompt}]

    source_lines = ""
    if sources:
        source_lines = "\n\nSources used:\n" + "\n".join(
            f"- [{s['source']}] {s.get('title', '')} — {s.get('url', '')}"
            for s in sources[:5]
        )

    injected_system = f"""{system_prompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIVE WEB SEARCH RESULTS (Retrieved just now — {__import__('datetime').datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{search_context}
{source_lines}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ STRICT GROUNDING RULES — FOLLOW EXACTLY:
1. The retrieved information above is LIVE and MORE ACCURATE than your training data.
2. If the retrieved data contradicts your internal memory, ALWAYS trust the retrieved data.
3. Your internal memory is OUTDATED for current events, politicians, prices, or live facts. Use ONLY the retrieved info above for these.
4. DO NOT hallucinate. If the context doesn't have the answer, state that you couldn't find specific details in current sources.
5. Answer ONLY using retrieved source content for factual claims.
6. Cite sources naturally. Do not use "As of my last update".
"""

    if images and len(images) > 0:
        injected_system += f"""
7. 🖼️ VISUAL SEARCH SUCCESS: High-quality images for the user's request have already been fetched by the backend and are CURRENTLY VISIBLE to the user in a beautiful image gallery component directly below your response.
   - DO NOT apologize or say "I am a text-based AI" or "I cannot display images".
   - DO NOT tell the user to "Google it" or "go to Unsplash".
   - DO acknowledge the images naturally, e.g., "Here are some stunning pictures of [Topic]." or "As you can see in the images provided..."
   - Provide a highly engaging, descriptive text response that complements the visual gallery they are seeing.
"""

    return [{"role": "system", "content": injected_system}]



def format_sources_for_response(sources: list[dict]) -> str:
    """
    Formats source list as a clean markdown string to append
    at the end of the AI response in the frontend.
    """
    if not sources:
        return ""

    lines = ["\n\n---\n**Sources**"]
    for i, s in enumerate(sources[:5], 1):
        title = s.get("title") or s.get("url", "Link")
        url   = s.get("url", "")
        src   = s.get("source", "Web")
        if url:
            lines.append(f"{i}. [{title}]({url}) — *{src}*")
        else:
            lines.append(f"{i}. {title} — *{src}*")
    return "\n".join(lines)
