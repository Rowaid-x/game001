"""Scoring configuration for 001 Game.

Scoring tiers are defined here for easy adjustment.
Points are based on how fast the team guesses correctly.
"""

SCORING_TIERS = [
    {'max_seconds': 30, 'points': 100},
    {'max_seconds': 60, 'points': 75},
    {'max_seconds': 90, 'points': 50},
    {'max_seconds': 120, 'points': 30},
    {'max_seconds': 180, 'points': 15},
    {'max_seconds': 240, 'points': 10},
]

TIMEOUT_POINTS = 0


def calculate_points(time_taken_seconds: float, multiplier: float = 1.0) -> int:
    """Calculate points based on time taken and optional multiplier.

    Args:
        time_taken_seconds: How many seconds the team took to guess.
        multiplier: Optional multiplier from power-ups (default 1.0).

    Returns:
        Integer points awarded.
    """
    if time_taken_seconds is None or time_taken_seconds < 0:
        return TIMEOUT_POINTS

    for tier in SCORING_TIERS:
        if time_taken_seconds <= tier['max_seconds']:
            return int(tier['points'] * multiplier)

    return TIMEOUT_POINTS
