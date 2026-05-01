"""
AI agent functions powered by the Anthropic SDK with web search.

Each function sends a crafted prompt to Claude with the server-side web_search
tool enabled, then parses the response into structured data.
"""

import json
import logging
import re
from typing import Any

from anthropic import Anthropic

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Client & tool setup
# ---------------------------------------------------------------------------
client = Anthropic()  # picks up ANTHROPIC_API_KEY from env

MODEL = "claude-sonnet-4-20250514"

WEB_SEARCH_TOOL = {
    "type": "web_search_20250305",
    "name": "web_search",
    "max_uses": 5,
}


# ---------------------------------------------------------------------------
# Response helpers
# ---------------------------------------------------------------------------
def _extract_text(response) -> str:
    """Pull all text blocks from a Claude response, ignoring tool-use blocks."""
    parts: list[str] = []
    for block in response.content:
        if hasattr(block, "text"):
            parts.append(block.text)
    return "\n".join(parts)


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
    Uses web search to pull in current, real-world information.
    """
    pref_section = f"\nTraveler preferences: {preferences}" if preferences else ""

    prompt = f"""You are a world-class travel planner. Create a detailed day-by-day
itinerary for a trip to {destination} from {start_date} to {end_date}.
{pref_section}

Use web search to find current, real information about:
- Top attractions and activities
- Local events happening during those dates
- Practical tips (transport, weather, etc.)

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
        response = client.messages.create(
            model=MODEL,
            max_tokens=8192,
            tools=[WEB_SEARCH_TOOL],
            messages=[{"role": "user", "content": prompt}],
        )
        text = _extract_text(response)
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
    Search for hotels at the destination using Claude + web search.
    Returns structured hotel results.
    """
    pref_section = f"\nPreferences: {preferences}" if preferences else ""

    prompt = f"""You are a hotel search assistant. Find real, currently operating hotels
in {destination} for a stay from {start_date} to {end_date}.
{pref_section}

Use web search to find actual hotels with real pricing and ratings.

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
        response = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            tools=[WEB_SEARCH_TOOL],
            messages=[{"role": "user", "content": prompt}],
        )
        text = _extract_text(response)
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
    Search for local restaurants at the destination using Claude + web search.
    Returns structured restaurant results.
    """
    pref_section = f"\nDining preferences: {preferences}" if preferences else ""

    prompt = f"""You are a local food expert. Find real, currently operating restaurants
in {destination} that a traveler should try.
{pref_section}

Use web search to find actual restaurants with real ratings and price info.

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
        response = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            tools=[WEB_SEARCH_TOOL],
            messages=[{"role": "user", "content": prompt}],
        )
        text = _extract_text(response)
        result = _extract_json(text)
        logger.info("Restaurant search completed for %s", destination)
        return result
    except Exception:
        logger.exception("Failed to search restaurants in %s", destination)
        raise
