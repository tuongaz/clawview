"""Tests for pricing module — model pricing and cost calculation."""

from __future__ import annotations

import pytest

from clawlens.pricing import MODEL_PRICING, calculate_cost, _get_model_pricing


# ---------------------------------------------------------------------------
# _get_model_pricing
# ---------------------------------------------------------------------------


class TestGetModelPricing:
    def test_exact_match(self) -> None:
        for model in MODEL_PRICING:
            assert _get_model_pricing(model) is MODEL_PRICING[model]

    def test_partial_match(self) -> None:
        # A model string that contains a known model name
        pricing = _get_model_pricing("claude-3-5-sonnet-20241022:thinking")
        assert pricing is MODEL_PRICING["claude-3-5-sonnet-20241022"]

    def test_unknown_model_falls_back_to_sonnet(self) -> None:
        pricing = _get_model_pricing("totally-unknown-model")
        assert pricing is MODEL_PRICING["claude-3-5-sonnet-20241022"]


# ---------------------------------------------------------------------------
# calculate_cost — per-model
# ---------------------------------------------------------------------------


class TestCalculateCost:
    def test_opus_4(self) -> None:
        cost = calculate_cost(
            "claude-opus-4-20250514",
            input_tokens=1_000_000,
            output_tokens=1_000_000,
        )
        assert cost["input_cost"] == pytest.approx(15.0)
        assert cost["output_cost"] == pytest.approx(75.0)
        assert cost["total_cost"] == pytest.approx(90.0)

    def test_sonnet_4(self) -> None:
        cost = calculate_cost(
            "claude-sonnet-4-20250514",
            input_tokens=1_000_000,
            output_tokens=1_000_000,
        )
        assert cost["input_cost"] == pytest.approx(3.0)
        assert cost["output_cost"] == pytest.approx(15.0)
        assert cost["total_cost"] == pytest.approx(18.0)

    def test_sonnet_35(self) -> None:
        cost = calculate_cost(
            "claude-3-5-sonnet-20241022",
            input_tokens=1_000_000,
            output_tokens=1_000_000,
        )
        assert cost["input_cost"] == pytest.approx(3.0)
        assert cost["output_cost"] == pytest.approx(15.0)
        assert cost["total_cost"] == pytest.approx(18.0)

    def test_haiku_35(self) -> None:
        cost = calculate_cost(
            "claude-3-5-haiku-20241022",
            input_tokens=1_000_000,
            output_tokens=1_000_000,
        )
        assert cost["input_cost"] == pytest.approx(1.0)
        assert cost["output_cost"] == pytest.approx(5.0)
        assert cost["total_cost"] == pytest.approx(6.0)

    def test_opus_3(self) -> None:
        cost = calculate_cost(
            "claude-3-opus-20240229",
            input_tokens=1_000_000,
            output_tokens=1_000_000,
        )
        assert cost["input_cost"] == pytest.approx(15.0)
        assert cost["output_cost"] == pytest.approx(75.0)
        assert cost["total_cost"] == pytest.approx(90.0)

    def test_haiku_3(self) -> None:
        cost = calculate_cost(
            "claude-3-haiku-20240307",
            input_tokens=1_000_000,
            output_tokens=1_000_000,
        )
        assert cost["input_cost"] == pytest.approx(0.25)
        assert cost["output_cost"] == pytest.approx(1.25)
        assert cost["total_cost"] == pytest.approx(1.50)


# ---------------------------------------------------------------------------
# Cache token costs
# ---------------------------------------------------------------------------


class TestCacheCosts:
    def test_cache_creation_cost(self) -> None:
        cost = calculate_cost(
            "claude-3-5-sonnet-20241022",
            cache_creation_tokens=1_000_000,
        )
        assert cost["cache_creation_cost"] == pytest.approx(3.75)
        assert cost["input_cost"] == pytest.approx(0.0)
        assert cost["output_cost"] == pytest.approx(0.0)
        assert cost["total_cost"] == pytest.approx(3.75)

    def test_cache_read_cost(self) -> None:
        cost = calculate_cost(
            "claude-3-5-sonnet-20241022",
            cache_read_tokens=1_000_000,
        )
        assert cost["cache_read_cost"] == pytest.approx(0.30)
        assert cost["total_cost"] == pytest.approx(0.30)

    def test_all_token_types(self) -> None:
        cost = calculate_cost(
            "claude-3-5-sonnet-20241022",
            input_tokens=1_000_000,
            output_tokens=1_000_000,
            cache_creation_tokens=1_000_000,
            cache_read_tokens=1_000_000,
        )
        assert cost["input_cost"] == pytest.approx(3.0)
        assert cost["output_cost"] == pytest.approx(15.0)
        assert cost["cache_creation_cost"] == pytest.approx(3.75)
        assert cost["cache_read_cost"] == pytest.approx(0.30)
        assert cost["total_cost"] == pytest.approx(22.05)


# ---------------------------------------------------------------------------
# Fallback behavior
# ---------------------------------------------------------------------------


class TestFallback:
    def test_unknown_model_uses_sonnet_pricing(self) -> None:
        cost = calculate_cost(
            "unknown-model-v99",
            input_tokens=1_000_000,
            output_tokens=1_000_000,
        )
        assert cost["input_cost"] == pytest.approx(3.0)
        assert cost["output_cost"] == pytest.approx(15.0)

    def test_zero_tokens(self) -> None:
        cost = calculate_cost("claude-opus-4-20250514")
        assert cost["total_cost"] == pytest.approx(0.0)
