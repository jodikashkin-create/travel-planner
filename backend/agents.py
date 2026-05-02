"""
AI agent functions powered by the Claude Agent SDK with web search.

Uses the claude-agent-sdk package (NOT the basic anthropic client) to run
a full agent loop with built-in WebSearch tool for real-time information.
"""

import asyncio
import json
import logging
import re
from typing import Any

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ResultMessage,
    TextBlock,
    query,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Response helpers
# ---------------------------------------------------------------------------
def _extract_json(text: str) -> Any:
    """
    Try to pull a JSON object or array from text that may contain markdown
    fences or surrounding prose.  Falls back to returning the raw text
    wrapped in a dict so callers always get something usable.
    """
    # Try the whole thing first
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass

    # Look for ```json ... ``` fenced blocks
    fence_match = re.search(r"```(?:json)?\s*\n?([\s\S]*?)```", text)
    if fence_match:
        try:
            return json.loads(fence_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Look for the first { ... } or [ ... ] blob
    for opener, closer in [("{", "}"), ("[", "]")]:
        start = text.find(opener)
        if start == -1:
            continue
        depth = 0
        for i, ch in enumerate(text[start:], start):
            if ch == opener:
                depth += 1
            elif ch == closer:
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start : i + 1])
                    except json.JSONDecodeError:
                        break

    # Last resort — return raw text in a wrapper
    return {"raw": text}


async def _run_agent(prompt: str, system_prompt: str, max_turns: int = 5) -> str:
    """
    Run a Claude Agent SDK query with WebSearch enabled.
    Collects all text output and returns the final result string.
    """
    result_text = ""
    assistant_text = ""

    async for message in query(
        prompt=prompt,
        options=ClaudeAgentOptions(
            system_prompt=system_prompt,
            max_turns=max_turns,
            allowed_tools=["WebSearch"],
        ),
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    assistant_text += block.text
        elif isinstance(message, ResultMessage):
            if message.result:
                result_text = message.result

    # Prefer the final result; fall back to accumulated assistant text
    return result_text or assistant_text


# ---------------------------------------------------------------------------
# Agent functions
# ---------------------------------------------------------------------------
async def generate_itinerary(
    destination: str,
    start_date: str,
    end_date: str,
    preferences: str = "",
) -> dict:
    """
    Generate a day-by-day travel itinerary for the given destination and dates.
    Uses the Claude Agent SDK with WebSearch to pull in real-world information.
    """
    pref_section = f"\nTraveler preferences: {preferences}" if preferences else ""

    system_prompt = """You are a world-class travel planner agent. You have access to web search
to find current, real information. Always search the web for up-to-date details about
attractions, events, pricing, and practical travel tips. Return structured JSON responses."""

    prompt = f"""Create a detailed day-by-day itinerary for a trip to {destination} from {start_date} to {end_date}.
{pref_section}

Search the web to find current, real information about:
- Top attractions and activities in {destination}
- Local events happening during those dates
- Practical tips (transport, weather, costs)

Return your answer as a JSON object with this exact structure (no extra keys):
{{
  "destination": "{destination}",
  "start_date": "{start_date}",
  "end_date": "{end_date}",
  "summary": "A 2-3 sentence trip overview",
  "days": [
    {{
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "Short theme for the day",
      "activities": [
        {{
          "time": "9:00 AM",
          "activity": "What to do",
          "description": "Details and tips",
          "location": "Where",
          "estimated_cost": "$XX"
        }}
      ],
      "meals": {{
        "breakfast": "Suggestion with location",
        "lunch": "Suggestion with location",
        "dinner": "Suggestion with location"
      }},
      "tips": "Any useful tips for the day"
    }}
  ],
  "packing_tips": ["item1", "item2"],
  "budget_estimate": {{
    "accommodation_per_night": "$XX",
    "food_per_day": "$XX",
    "activities_total": "$XX",
    "estimated_total": "$XX"
  }}
}}

Return ONLY the JSON object, no markdown fences, no commentary."""

    try:
        logger.info("Generating itinerary for %s (%s to %s)", destination, start_date, end_date)
        text = await _run_agent(prompt, system_prompt, max_turns=3)
        result = _extract_json(text)
        logger.info("Itinerary generated successfully for %s", destination)
        return result
    except Exception:
        logger.exception("Failed to generate itinerary for %s", destination)
        raise


async def search_hotels(
    destination: str,
    start_date: str,
    end_date: str,
    preferences: str = "",
) -> dict:
    """
    Search for hotels at the destination using the Claude Agent SDK with web search.
    Returns structured hotel results.
    """
    pref_section = f"\nPreferences: {preferences}" if preferences else ""

    system_prompt = """You are a hotel search assistant agent. You have access to web search
to find real, currently operating hotels with actual pricing and ratings.
Always search the web for up-to-date hotel information. Return structured JSON responses."""

    prompt = f"""Find real, currently operating hotels in {destination} for a stay from {start_date} to {end_date}.
{pref_section}

Search the web to find actual hotels with real pricing and ratings.

Return your answer as a JSON object with this exact structure:
{{
  "destination": "{destination}",
  "check_in": "{start_date}",
  "check_out": "{end_date}",
  "hotels": [
    {{
      "name": "Hotel Name",
      "description": "2-3 sentence description",
      "price_range": "$XXX - $XXX per night",
      "rating": 4.5,
      "location": "Neighborhood / address",
      "amenities": ["WiFi", "Pool", "Breakfast"],
      "booking_tip": "Any useful booking info"
    }}
  ]
}}

Find at least 5 hotels across different price ranges (budget, mid-range, luxury).
Return ONLY the JSON object, no markdown fences, no commentary."""

    try:
        logger.info("Searching hotels in %s (%s to %s)", destination, start_date, end_date)
        text = await _run_agent(prompt, system_prompt, max_turns=3)
        result = _extract_json(text)
        logger.info("Hotel search completed for %s", destination)
        return result
    except Exception:
        logger.exception("Failed to search hotels in %s", destination)
        raise


async def search_restaurants(
    destination: str,
    preferences: str = "",
) -> dict:
    """
    Search for local restaurants at the destination using the Claude Agent SDK
    with web search. Returns structured restaurant results.
    """
    pref_section = f"\nDining preferences: {preferences}" if preferences else ""

    system_prompt = """You are a local food expert agent. You have access to web search
to find real, currently operating restaurants with actual ratings and pricing.
Always search the web for up-to-date restaurant information. Return structured JSON responses."""

    prompt = f"""Find real, currently operating restaurants in {destination} that a traveler should try.
{pref_section}

Search the web to find actual restaurants with real ratings and price info.

Return your answer as a JSON object with this exact structure:
{{
  "destination": "{destination}",
  "restaurants": [
    {{
      "name": "Restaurant Name",
      "cuisine": "Type of cuisine",
      "price_range": "$$ (e.g. $, $$, $$$, $$$$)",
      "rating": 4.5,
      "description": "2-3 sentence description of the food and atmosphere",
      "location": "Neighborhood / address",
      "must_try": "Signature dish or recommendation",
      "reservation_tip": "Any useful reservation info"
    }}
  ]
}}

Find at least 8 restaurants covering:
- Local / traditional cuisine (at least 2)
- Fine dining (at least 1)
- Casual / street food (at least 2)
- International options (at least 1)
- Breakfast / brunch spot (at least 1)
- A hidden gem or local favorite (at least 1)

Return ONLY the JSON object, no markdown fences, no commentary."""

    try:
        logger.info("Searching restaurants in %s", destination)
        text = await _run_agent(prompt, system_prompt, max_turns=3)
        result = _extract_json(text)
        logger.info("Restaurant search completed for %s", destination)
        return result
    except Exception:
        logger.exception("Failed to search restaurants in %s", destination)
        raise
