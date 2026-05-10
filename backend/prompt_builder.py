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

⚠️ CRITICAL INSTRUCTIONS — FOLLOW EXACTLY:
1. The retrieved information above is LIVE and MORE ACCURATE than your training data.
2. If the retrieved data contradicts your training knowledge, ALWAYS trust the retrieved data.
3. Your training knowledge has a cutoff date — for current events, politicians, prices, scores, 
   or any time-sensitive facts, USE ONLY the retrieved information above.
4. Cite sources naturally in your answer. Do not output raw markdown links or bracketed citations in the text.
5. Be direct and confident. Synthesize the retrieved info into a clear, single answer. Do not hedge by saying "the exact name is not mentioned" if you can clearly infer it from the context (e.g., if a party leader just won the state election, they are the Chief Minister).
6. Do NOT say "As of my last update" or "I don't have real-time data" — you DO have it above.
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
