"""Game service layer — all game logic lives here.

Views and WebSocket consumers delegate to these functions.
This separation makes it easy to add power-ups and wildcards later.
"""
import uuid
import logging
import random
from django.utils import timezone
from django.db import transaction
from .models import Game, Team, Player, Round, Category, Prompt
from .scoring import calculate_points

logger = logging.getLogger('game')


class GameService:
    """Stateless service class for game operations."""

    @staticmethod
    @transaction.atomic
    def create_game(host_name: str, session_key: str) -> dict:
        """Create a new game and the host player."""
        game = Game.objects.create()

        Team.objects.create(game=game, name='Team 1', color='#3B82F6', order=1)
        Team.objects.create(game=game, name='Team 2', color='#EF4444', order=2)

        host = Player.objects.create(
            game=game,
            name=host_name,
            session_key=session_key,
            is_host=True,
        )

        logger.info(f"Game {game.code} created by {host_name}")
        return {
            'game': game,
            'host': host,
        }

    @staticmethod
    def join_game(game_code: str, player_name: str, session_key: str) -> Player:
        """Add a player to an existing game."""
        game = Game.objects.get(code=game_code.upper())

        if game.status != 'lobby':
            raise ValueError("Game has already started")

        existing = Player.objects.filter(game=game, session_key=session_key).first()
        if existing:
            existing.name = player_name
            existing.save()
            logger.info(f"Player {player_name} rejoined game {game.code}")
            return existing

        player = Player.objects.create(
            game=game,
            name=player_name,
            session_key=session_key,
        )
        logger.info(f"Player {player_name} joined game {game.code}")
        return player

    @staticmethod
    def host_add_player(game_code: str, player_name: str, team_id: str = None) -> Player:
        """Host adds a player by name (no phone/QR needed)."""
        game = Game.objects.get(code=game_code.upper())

        if game.status != 'lobby':
            raise ValueError("Game has already started")

        session_key = f'host_added_{uuid.uuid4().hex[:12]}'
        team = Team.objects.get(id=team_id) if team_id else None

        player = Player.objects.create(
            game=game,
            name=player_name,
            session_key=session_key,
            team=team,
        )
        logger.info(f"Host added player {player_name} to game {game.code}")
        return player

    @staticmethod
    def assign_player_to_team(player_id: str, team_id: str) -> Player:
        """Assign a player to a team."""
        player = Player.objects.get(id=player_id)
        team = Team.objects.get(id=team_id)

        if player.game_id != team.game_id:
            raise ValueError("Player and team are not in the same game")

        player.team = team
        player.save()
        logger.info(f"Player {player.name} assigned to {team.name}")
        return player

    @staticmethod
    def update_team(team_id: str, name: str = None, color: str = None) -> Team:
        """Update team name or color."""
        team = Team.objects.get(id=team_id)
        if name is not None:
            team.name = name
        if color is not None:
            team.color = color
        team.save()
        return team

    @staticmethod
    def update_game_settings(game_code: str, **kwargs) -> Game:
        """Update game settings (rounds, time, categories)."""
        game = Game.objects.get(code=game_code.upper())

        if 'total_rounds' in kwargs:
            game.total_rounds = kwargs['total_rounds']
        if 'max_time_per_turn' in kwargs:
            game.max_time_per_turn = kwargs['max_time_per_turn']
        if 'settings' in kwargs:
            game.settings.update(kwargs['settings'])
        if 'category_ids' in kwargs:
            game.selected_categories.set(kwargs['category_ids'])

        game.save()
        return game

    @staticmethod
    @transaction.atomic
    def start_game(game_code: str) -> Game:
        """Start the game — validate teams and create first round."""
        game = Game.objects.select_related().get(code=game_code.upper())

        if game.status != 'lobby':
            raise ValueError("Game is not in lobby state")

        teams = list(game.teams.all())
        if len(teams) < 2:
            raise ValueError("Need at least 2 teams")

        for team in teams:
            if team.players.count() < 1:
                raise ValueError(f"Team {team.name} needs at least 1 player")

        game.status = 'in_progress'
        game.current_round = 1
        game.save()

        first_team = teams[0]
        Round.objects.create(
            game=game,
            round_number=1,
            team=first_team,
            status='selecting_actor',
        )

        logger.info(f"Game {game.code} started with {game.total_rounds} rounds")
        return game

    @staticmethod
    def select_actor(round_id: str, player_id: str) -> Round:
        """Select the actor for a round."""
        game_round = Round.objects.select_related('game', 'team').get(id=round_id)
        player = Player.objects.get(id=player_id)

        if player.team_id != game_round.team_id:
            raise ValueError("Actor must be on the active team")

        game_round.actor = player
        game_round.status = 'selecting_category'
        game_round.save()

        logger.info(f"Round {game_round.round_number}: {player.name} selected as actor")
        return game_round

    @staticmethod
    @transaction.atomic
    def select_category(round_id: str, category_id: str) -> Round:
        """Select category and assign a random prompt for the round."""
        game_round = Round.objects.select_related('game').get(id=round_id)
        category = Category.objects.get(id=category_id)

        used_prompt_ids = Round.objects.filter(
            game=game_round.game,
            prompt__isnull=False,
        ).values_list('prompt_id', flat=True)

        available_prompts = Prompt.objects.filter(
            category=category,
            is_active=True,
        ).exclude(id__in=used_prompt_ids)

        if not available_prompts.exists():
            available_prompts = Prompt.objects.filter(
                category=category,
                is_active=True,
            )

        if not available_prompts.exists():
            raise ValueError(f"No prompts available in category {category.name}")

        prompt = random.choice(list(available_prompts))

        token = uuid.uuid4().hex
        game_round.category = category
        game_round.prompt = prompt
        game_round.token = token
        game_round.status = 'showing_qr'
        game_round.save()

        prompt.times_used += 1
        prompt.save(update_fields=['times_used'])

        logger.info(f"Round {game_round.round_number}: category={category.name}, prompt={prompt.title}")
        return game_round

    @staticmethod
    def get_prompt_for_actor(round_id: str, token: str) -> dict:
        """Get the prompt details for the actor (secured by token)."""
        game_round = Round.objects.select_related('prompt', 'prompt__category').get(id=round_id)

        if game_round.token != token:
            raise PermissionError("Invalid token")

        if game_round.status not in ('showing_qr', 'prompt_reveal', 'actor_ready', 'active'):
            raise ValueError("Round is not in a valid state to view prompt")

        prompt = game_round.prompt
        return {
            'round_id': str(game_round.id),
            'round_number': game_round.round_number,
            'title': prompt.title,
            'title_ar': prompt.title_ar,
            'image_url': prompt.get_image_display_url(),
            'category': prompt.category.name,
            'category_ar': prompt.category.name_ar,
            'category_icon': prompt.category.icon,
        }

    @staticmethod
    def actor_ready(round_id: str) -> Round:
        """Mark the actor as ready — they've seen the prompt."""
        game_round = Round.objects.get(id=round_id)
        game_round.status = 'actor_ready'
        game_round.save()
        logger.info(f"Round {game_round.round_number}: actor is ready")
        return game_round

    @staticmethod
    def start_timer(round_id: str) -> Round:
        """Start the round timer."""
        game_round = Round.objects.get(id=round_id)
        if game_round.status not in ('actor_ready', 'prompt_reveal', 'showing_qr'):
            raise ValueError("Round is not ready to start timer")
        game_round.status = 'active'
        game_round.started_at = timezone.now()
        game_round.save()
        logger.info(f"Round {game_round.round_number}: timer started")
        return game_round

    @staticmethod
    @transaction.atomic
    def correct_guess(round_id: str) -> dict:
        """Mark the round as correctly guessed and award points."""
        game_round = Round.objects.select_related('game', 'team', 'prompt').get(id=round_id)

        if game_round.status != 'active':
            raise ValueError("Round is not active")

        now = timezone.now()
        time_taken = (now - game_round.started_at).total_seconds()

        multiplier = game_round.metadata.get('multiplier', 1.0)
        points = calculate_points(time_taken, multiplier)

        game_round.status = 'guessed'
        game_round.ended_at = now
        game_round.time_taken_seconds = round(time_taken, 1)
        game_round.points_awarded = points
        game_round.save()

        team = game_round.team
        team.total_score += points
        team.save()

        logger.info(
            f"Round {game_round.round_number}: guessed in {time_taken:.1f}s, "
            f"{points} points to {team.name}"
        )

        return {
            'round': game_round,
            'time_taken': round(time_taken, 1),
            'points': points,
            'team_score': team.total_score,
        }

    @staticmethod
    @transaction.atomic
    def timeout_round(round_id: str) -> Round:
        """Mark the round as timed out."""
        game_round = Round.objects.select_related('game', 'team').get(id=round_id)

        if game_round.status != 'active':
            raise ValueError("Round is not active")

        now = timezone.now()
        game_round.status = 'timeout'
        game_round.ended_at = now
        game_round.time_taken_seconds = (now - game_round.started_at).total_seconds()
        game_round.points_awarded = 0
        game_round.save()

        logger.info(f"Round {game_round.round_number}: timed out")
        return game_round

    @staticmethod
    @transaction.atomic
    def skip_round(round_id: str) -> Round:
        """Skip the current round."""
        game_round = Round.objects.select_related('game', 'team').get(id=round_id)

        if game_round.status not in ('active', 'showing_qr', 'prompt_reveal', 'actor_ready', 'selecting_actor', 'selecting_category'):
            raise ValueError("Round cannot be skipped in current state")

        now = timezone.now()
        game_round.status = 'skipped'
        game_round.ended_at = now
        if game_round.started_at:
            game_round.time_taken_seconds = (now - game_round.started_at).total_seconds()
        game_round.points_awarded = 0
        game_round.save()

        logger.info(f"Round {game_round.round_number}: skipped")
        return game_round

    @staticmethod
    @transaction.atomic
    def advance_to_next_round(game_code: str) -> dict:
        """Advance to the next round or finish the game."""
        game = Game.objects.get(code=game_code.upper())

        if game.current_round >= game.total_rounds:
            game.status = 'finished'
            game.save()
            logger.info(f"Game {game.code} finished")
            return {'finished': True, 'game': game}

        next_round_number = game.current_round + 1
        game.current_round = next_round_number
        game.save()

        teams = list(game.teams.order_by('order'))
        current_round_obj = game.rounds.get(round_number=game.current_round - 1)
        current_team_order = current_round_obj.team.order
        next_team = teams[0] if current_team_order == 2 else teams[1]

        new_round = Round.objects.create(
            game=game,
            round_number=next_round_number,
            team=next_team,
            status='selecting_actor',
        )

        logger.info(f"Game {game.code}: advanced to round {next_round_number}, team {next_team.name}")
        return {'finished': False, 'round': new_round, 'game': game}

    @staticmethod
    def get_scoreboard(game_code: str) -> dict:
        """Get the final scoreboard for a game."""
        game = Game.objects.get(code=game_code.upper())
        teams = game.teams.all()
        rounds = game.rounds.filter(status__in=['guessed', 'timeout', 'skipped']).select_related(
            'team', 'actor', 'prompt', 'category'
        )

        best_round = rounds.filter(status='guessed').order_by('time_taken_seconds').first()

        team_data = []
        for team in teams:
            team_rounds = rounds.filter(team=team)
            team_data.append({
                'id': str(team.id),
                'name': team.name,
                'color': team.color,
                'total_score': team.total_score,
                'rounds_won': team_rounds.filter(status='guessed').count(),
                'rounds_timeout': team_rounds.filter(status='timeout').count(),
            })

        winner = max(team_data, key=lambda t: t['total_score']) if team_data else None

        return {
            'game_code': game.code,
            'teams': team_data,
            'winner': winner,
            'best_round': {
                'round_number': best_round.round_number,
                'time_taken': best_round.time_taken_seconds,
                'points': best_round.points_awarded,
                'actor': best_round.actor.name if best_round.actor else 'Unknown',
                'prompt': best_round.prompt.title if best_round.prompt else 'Unknown',
            } if best_round else None,
            'total_rounds_played': rounds.count(),
        }

    @staticmethod
    def get_game_state(game_code: str) -> dict:
        """Get the full current state of a game."""
        game = Game.objects.prefetch_related(
            'teams__players', 'rounds', 'selected_categories'
        ).get(code=game_code.upper())

        teams = []
        for team in game.teams.all():
            teams.append({
                'id': str(team.id),
                'name': team.name,
                'color': team.color,
                'total_score': team.total_score,
                'order': team.order,
                'players': [
                    {'id': str(p.id), 'name': p.name, 'is_host': p.is_host}
                    for p in team.players.all()
                ],
            })

        unassigned_players = game.players.filter(team__isnull=True)

        current_round = None
        if game.status == 'in_progress':
            round_obj = game.rounds.filter(round_number=game.current_round).select_related(
                'team', 'actor', 'category', 'prompt'
            ).first()
            if round_obj:
                current_round = {
                    'id': str(round_obj.id),
                    'round_number': round_obj.round_number,
                    'team_id': str(round_obj.team_id),
                    'team_name': round_obj.team.name,
                    'team_color': round_obj.team.color,
                    'actor_id': str(round_obj.actor_id) if round_obj.actor else None,
                    'actor_name': round_obj.actor.name if round_obj.actor else None,
                    'category_name': round_obj.category.name if round_obj.category else None,
                    'category_icon': round_obj.category.icon if round_obj.category else None,
                    'status': round_obj.status,
                    'token': round_obj.token,
                    'started_at': round_obj.started_at.isoformat() if round_obj.started_at else None,
                    'time_taken_seconds': round_obj.time_taken_seconds,
                    'points_awarded': round_obj.points_awarded,
                }

        return {
            'code': game.code,
            'status': game.status,
            'current_round': game.current_round,
            'total_rounds': game.total_rounds,
            'max_time_per_turn': game.max_time_per_turn,
            'teams': teams,
            'unassigned_players': [
                {'id': str(p.id), 'name': p.name, 'is_host': p.is_host}
                for p in unassigned_players
            ],
            'round': current_round,
            'selected_categories': [
                {'id': str(c.id), 'name': c.name, 'name_ar': c.name_ar, 'icon': c.icon}
                for c in game.selected_categories.all()
            ],
        }
