"""
AI agent functions using the Anthropic SDK with agentic tool-use patterns.

Uses the anthropic Python SDK with server-side web search tool in an agentic
loop: the model autonomously decides when to search, processes results, and
may search multiple times before generating the final response.

Note: The Claude Agent SDK (claude-agent-sdk) was our first choice, but its
bundled native binary cannot run on Render's free tier. The anthropic SDK
with server-side web_search provides identical agentic behavior — the model
still autonomously decides to search and iterate — without the binary overhead.
"""

import json
import logging
import re
from typing import Any

from anthropic import AsyncAnthropic

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Client & configuration
# ---------------------------------------------------------------------------
client = AsyncAnthropic()  # picks up ANTHROPIC_API_KEY from env

MODEL = "claude-sonnet-4-6"

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


async def _run_agent(system_prompt: str, user_prompt: str) -> str:
    """
    Run an agentic query with Claude + server-side web search.

    The web_search tool is executed server-side by Anthropic's API — no
    client-side tool loop needed. The model autonomously decides when to
    search the web, and the API handles the search execution and feeds
    results back to the model within a single API call.
    """
    response = await client.messages.create(
        model=MODEL,
        max_tokens=8192,
        system=system_prompt,
        tools=[WEB_SEARCH_TOOL],
        messages=[{"role": "user", "content": user_prompt}],
    )
    return _extract_text(response)


# ---------------------------------------------------------------------------
# Agent functions
# ---------------------------------------------------------------------------
async def generate_itinerary(
    destination: str,
    start_date: str,
    end_date: str,
    preferences: str = "",
    accommodation_type: str = "",
    experience_type: str = "",
    restaurant_pref: str = "",
    hotspots: str = "",
    downtime_hours: str = "2",
) -> dict:
    """
    Generate a day-by-day travel itinerary for the given destination and dates.
    The agent uses web search to find current, real-world information.
    Includes seasonal tips, excitement highlights, downtime planning, and
    personalized recommendations based on traveler preferences.
    """
    # Build conditional preference sections
    sections = []
    if preferences:
        sections.append(f"General preferences: {preferences}")
    if accommodation_type:
        sections.append(f"Accommodation preference: {accommodation_type}")
    if experience_type:
        sections.append(f"Experience preference: {experience_type}")
    if restaurant_pref:
        sections.append(f"Restaurant preference: {restaurant_pref}")
    if hotspots:
        sections.append(f"Also consider these specific interests/hotspots: {hotspots}")
    pref_block = "\n".join(sections)

    system_prompt = (
        "You are a world-class travel planner who creates exciting, deeply personalized "
        "itineraries that make travelers count down the days until their trip. You have "
        "access to web search — always search the web for current, real-world information "
        "about attractions, seasonal events, weather, pricing, and practical travel tips. "
        "Return structured JSON responses."
    )

    prompt = f"""Create a detailed, exciting day-by-day itinerary for a trip to {destination}.

The trip is from {start_date} to {end_date}. Consider what's in season, weather patterns, and any seasonal events or festivals during this time.

{pref_block}

Plan {downtime_hours} hours of downtime/free time each day for rest, wandering, or spontaneous exploration.

Search the web to find current, real information about:
- Top attractions, activities, and hidden gems in {destination}
- Seasonal events, festivals, or special happenings during those dates
- Current weather patterns for that time of year
- Practical tips (transport, costs, what to wear)
- The best local food spots

Return your answer as a JSON object with this exact structure (no extra keys):
{{
  "destination": "{destination}",
  "start_date": "{start_date}",
  "end_date": "{end_date}",
  "summary": "A 2-3 sentence trip overview that gets people excited",
  "seasonal_overview": "A 2-3 sentence overview of what the season/weather is like during the trip dates, including any notable seasonal events or considerations",
  "days": [
    {{
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "Short theme for the day",
      "excitement": "One enthusiastic sentence about what makes this day special — what should travelers be MOST excited about today",
      "seasonal_tip": "A tip related to the season/weather for this day",
      "activities": [
        {{
          "time": "9:00 AM",
          "activity": "What to do",
          "description": "Details and tips",
          "location": "Where",
          "duration": "2 hours",
          "estimated_cost": "$XX",
          "why_exciting": "One sentence on why this is a must-do"
        }}
      ],
      "downtime": {{
        "suggested_time": "2:00 PM - 4:00 PM",
        "suggestion": "What to do during downtime — e.g., relax at the hotel pool, wander the neighborhood, grab a coffee at a local cafe"
      }},
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
        text = await _run_agent(system_prompt, prompt)
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
    accommodation_type: str = "",
) -> dict:
    """
    Search for hotels at the destination. The agent uses web search to find
    real, currently operating hotels with actual pricing and ratings.
    Prioritizes results matching the traveler's accommodation preference.
    """
    pref_section = f"\nPreferences: {preferences}" if preferences else ""

    accom_section = ""
    if accommodation_type:
        accom_section = (
            f"\nThe traveler is looking for: {accommodation_type}. "
            "Prioritize hotels that match this preference. For example, if they want "
            "'coastal' find beachfront hotels, if 'pool' find hotels with great pools, "
            "if 'city center' find centrally located hotels, if 'boutique' find unique "
            "boutique properties."
        )

    system_prompt = (
        "You are a hotel search assistant agent. You have access to web search "
        "to find real, currently operating hotels with actual pricing and ratings. "
        "Always search the web for up-to-date hotel information. Return structured "
        "JSON responses."
    )

    prompt = f"""Find real, currently operating hotels in {destination} for a stay from {start_date} to {end_date}.
{pref_section}{accom_section}

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
      "booking_tip": "Any useful booking info",
      "match_reason": "Why this hotel matches the traveler's preference"
    }}
  ]
}}

Find at least 5 hotels across different price ranges (budget, mid-range, luxury).
Return ONLY the JSON object, no markdown fences, no commentary."""

    try:
        logger.info("Searching hotels in %s (%s to %s)", destination, start_date, end_date)
        text = await _run_agent(system_prompt, prompt)
        result = _extract_json(text)
        logger.info("Hotel search completed for %s", destination)
        return result
    except Exception:
        logger.exception("Failed to search hotels in %s", destination)
        raise


async def search_restaurants(
    destination: str,
    preferences: str = "",
    restaurant_pref: str = "",
) -> dict:
    """
    Search for local restaurants at the destination. The agent uses web search
    to find real restaurants with actual ratings and pricing.
    Adapts results based on whether the traveler wants social-media-famous spots,
    hidden local gems, or a mix of both.
    """
    pref_section = f"\nDining preferences: {preferences}" if preferences else ""

    # Tailor the focus based on restaurant_pref
    if restaurant_pref and "social media" in restaurant_pref.lower():
        focus_section = (
            "\nFocus on trending, Instagram-famous, and TikTok-viral restaurants. "
            "The traveler wants the spots that are blowing up on social media right now — "
            "photogenic dishes, viral food trends, influencer-recommended places."
        )
    elif restaurant_pref and "local gem" in restaurant_pref.lower():
        focus_section = (
            "\nFocus on hidden gems and locals-only spots. The traveler wants hole-in-the-wall "
            "places, family-run restaurants, neighborhood favorites that tourists usually miss — "
            "the spots where locals actually eat."
        )
    else:
        focus_section = (
            "\nInclude a balance of both trending social-media-famous spots AND hidden local gems. "
            "The traveler wants a mix of photogenic viral restaurants and authentic locals-only favorites."
        )

    system_prompt = (
        "You are a local food expert agent. You have access to web search "
        "to find real, currently operating restaurants with actual ratings and pricing. "
        "Always search the web for up-to-date restaurant information. Return structured "
        "JSON responses."
    )

    prompt = f"""Find real, currently operating restaurants in {destination} that a traveler should try.
{pref_section}{focus_section}

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
      "reservation_tip": "Any useful reservation info",
      "vibe": "social media famous / local gem / classic institution / trendy newcomer"
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
        text = await _run_agent(system_prompt, prompt)
        result = _extract_json(text)
        logger.info("Restaurant search completed for %s", destination)
        return result
    except Exception:
        logger.exception("Failed to search restaurants in %s", destination)
        raise
