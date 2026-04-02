"""Pricing utilities for calculating Claude API costs."""

from __future__ import annotations

# Pricing in USD per million tokens
# Cache multipliers: creation = input × 1.25, read = input × 0.10
MODEL_PRICING: dict[str, dict[str, float]] = {
    "claude-opus-4-20250514": {
        "input": 15.0,
        "output": 75.0,
        "cache_creation": 18.75,
        "cache_read": 1.50,
    },
    "claude-sonnet-4-20250514": {
        "input": 3.0,
        "output": 15.0,
        "cache_creation": 3.75,
        "cache_read": 0.30,
    },
    "claude-3-5-sonnet-20241022": {
        "input": 3.0,
        "output": 15.0,
        "cache_creation": 3.75,
        "cache_read": 0.30,
    },
    "claude-3-5-haiku-20241022": {
        "input": 1.0,
        "output": 5.0,
        "cache_creation": 1.25,
        "cache_read": 0.10,
    },
    "claude-3-opus-20240229": {
        "input": 15.0,
        "output": 75.0,
        "cache_creation": 18.75,
        "cache_read": 1.50,
    },
    "claude-3-haiku-20240307": {
        "input": 0.25,
        "output": 1.25,
        "cache_creation": 0.30,
        "cache_read": 0.03,
    },
}

_FALLBACK_MODEL = "claude-3-5-sonnet-20241022"


def _get_model_pricing(model: str) -> dict[str, float]:
    """Get pricing for a model, falling back to claude-3-5-sonnet for unknowns."""
    if model in MODEL_PRICING:
        return MODEL_PRICING[model]
    # Try partial match
    for known, pricing in MODEL_PRICING.items():
        if model in known or known in model:
            return pricing
    return MODEL_PRICING[_FALLBACK_MODEL]


def calculate_cost(
    model: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    cache_creation_tokens: int = 0,
    cache_read_tokens: int = 0,
) -> dict[str, float]:
    """Calculate cost given model name and token counts.

    Returns dict with input_cost, output_cost, cache_creation_cost,
    cache_read_cost, and total_cost (all in USD).
    """
    pricing = _get_model_pricing(model)
    costs = {
        "input_cost": input_tokens * pricing["input"] / 1_000_000,
        "output_cost": output_tokens * pricing["output"] / 1_000_000,
        "cache_creation_cost": cache_creation_tokens * pricing["cache_creation"] / 1_000_000,
        "cache_read_cost": cache_read_tokens * pricing["cache_read"] / 1_000_000,
    }
    costs["total_cost"] = sum(costs.values())
    return costs
