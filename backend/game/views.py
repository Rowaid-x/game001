"""API views for 001 Game."""
import uuid
import logging
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import Game, Team, Player, Category, Prompt, Round
from .serializers import (
    GameSerializer, TeamSerializer, CategorySerializer, RoundSerializer,
    CreateGameSerializer, JoinGameSerializer, AssignPlayerSerializer,
    UpdateTeamSerializer, GameSettingsSerializer, SelectActorSerializer,
    SelectCategorySerializer,
)
from .services import GameService

logger = logging.getLogger('game')


@method_decorator(csrf_exempt, name='dispatch')
class GameViewSet(viewsets.GenericViewSet):
    """Game management endpoints."""
    lookup_field = 'code'

    def get_queryset(self):
        return Game.objects.prefetch_related('teams__players', 'rounds', 'selected_categories')

    def create(self, request):
        """POST /api/games/ — Create a new game."""
        try:
            serializer = CreateGameSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            session_key = request.data.get('session_key', '') or f'host_{uuid.uuid4().hex[:16]}'

            result = GameService.create_game(
                host_name=serializer.validated_data['host_name'],
                session_key=session_key,
            )

            game = result['game']
            return Response({
                'code': game.code,
                'game': GameSerializer(game).data,
                'player_id': str(result['host'].id),
                'session_key': session_key,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error creating game: {e}", exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def retrieve(self, request, code=None):
        """GET /api/games/{code}/ — Get game state."""
        game = get_object_or_404(self.get_queryset(), code=code.upper())
        return Response(GameSerializer(game).data)

    @action(detail=True, methods=['post'], url_path='join')
    def join(self, request, code=None):
        """POST /api/games/{code}/join/ — Join a game."""
        serializer = JoinGameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_key = request.data.get('session_key', '')
        if not session_key:
            session_key = request.session.session_key
            if not session_key:
                request.session.create()
                session_key = request.session.session_key

        try:
            player = GameService.join_game(
                game_code=code,
                player_name=serializer.validated_data['player_name'],
                session_key=session_key,
            )
            return Response({
                'player_id': str(player.id),
                'session_key': session_key,
                'player_name': player.name,
                'team_id': str(player.team_id) if player.team_id else None,
            })
        except Game.DoesNotExist:
            return Response({'error': 'Game not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'], url_path='settings')
    def update_settings(self, request, code=None):
        """PATCH /api/games/{code}/settings/ — Update game settings."""
        serializer = GameSettingsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            game = GameService.update_game_settings(code, **serializer.validated_data)
            return Response(GameSerializer(game).data)
        except Game.DoesNotExist:
            return Response({'error': 'Game not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='start')
    def start(self, request, code=None):
        """POST /api/games/{code}/start/ — Start the game."""
        try:
            game = GameService.start_game(code)
            return Response(GameSerializer(game).data)
        except Game.DoesNotExist:
            return Response({'error': 'Game not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='assign-player')
    def assign_player(self, request, code=None):
        """POST /api/games/{code}/assign-player/ — Assign player to team."""
        serializer = AssignPlayerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            player = GameService.assign_player_to_team(
                player_id=str(serializer.validated_data['player_id']),
                team_id=str(serializer.validated_data['team_id']),
            )
            return Response({
                'player_id': str(player.id),
                'team_id': str(player.team_id),
            })
        except (Player.DoesNotExist, Team.DoesNotExist):
            return Response({'error': 'Player or team not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'], url_path='teams/(?P<team_id>[^/.]+)')
    def update_team(self, request, code=None, team_id=None):
        """PATCH /api/games/{code}/teams/{id}/ — Update team."""
        serializer = UpdateTeamSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            team = GameService.update_team(team_id, **serializer.validated_data)
            return Response(TeamSerializer(team).data)
        except Team.DoesNotExist:
            return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'], url_path='scoreboard')
    def scoreboard(self, request, code=None):
        """GET /api/games/{code}/scoreboard/ — Get final scoreboard."""
        try:
            result = GameService.get_scoreboard(code)
            return Response(result)
        except Game.DoesNotExist:
            return Response({'error': 'Game not found'}, status=status.HTTP_404_NOT_FOUND)


@method_decorator(csrf_exempt, name='dispatch')
class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Category listing endpoints."""
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer


@method_decorator(csrf_exempt, name='dispatch')
class RoundViewSet(viewsets.GenericViewSet):
    """Round action endpoints."""

    @action(detail=True, methods=['get'], url_path='prompt')
    def prompt(self, request, pk=None):
        """GET /api/rounds/{id}/prompt/ — Get prompt for actor."""
        token = request.query_params.get('token', '')
        try:
            result = GameService.get_prompt_for_actor(pk, token)
            return Response(result)
        except Round.DoesNotExist:
            return Response({'error': 'Round not found'}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError:
            return Response({'error': 'Invalid token'}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='select-actor')
    def select_actor(self, request, pk=None):
        """POST /api/rounds/{id}/select-actor/ — Select actor."""
        serializer = SelectActorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            game_round = GameService.select_actor(pk, str(serializer.validated_data['player_id']))
            return Response(RoundSerializer(game_round).data)
        except (Round.DoesNotExist, Player.DoesNotExist):
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='select-category')
    def select_category(self, request, pk=None):
        """POST /api/rounds/{id}/select-category/ — Select category."""
        serializer = SelectCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            game_round = GameService.select_category(pk, str(serializer.validated_data['category_id']))
            return Response(RoundSerializer(game_round).data)
        except (Round.DoesNotExist, Category.DoesNotExist):
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='actor-ready')
    def actor_ready(self, request, pk=None):
        """POST /api/rounds/{id}/actor-ready/ — Actor is ready."""
        try:
            game_round = GameService.actor_ready(pk)
            # Broadcast to host via WebSocket
            game_code = game_round.game.code
            state = GameService.get_game_state(game_code)
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'game_{game_code}',
                {
                    'type': 'broadcast_actor_ready',
                    'data': state,
                }
            )
            return Response(RoundSerializer(game_round).data)
        except Round.DoesNotExist:
            return Response({'error': 'Round not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='start-timer')
    def start_timer(self, request, pk=None):
        """POST /api/rounds/{id}/start-timer/ — Start the timer."""
        try:
            game_round = GameService.start_timer(pk)
            return Response(RoundSerializer(game_round).data)
        except Round.DoesNotExist:
            return Response({'error': 'Round not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='correct')
    def correct(self, request, pk=None):
        """POST /api/rounds/{id}/correct/ — Mark as correctly guessed."""
        try:
            result = GameService.correct_guess(pk)
            return Response({
                'round': RoundSerializer(result['round']).data,
                'time_taken': result['time_taken'],
                'points': result['points'],
                'team_score': result['team_score'],
            })
        except Round.DoesNotExist:
            return Response({'error': 'Round not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='timeout')
    def timeout(self, request, pk=None):
        """POST /api/rounds/{id}/timeout/ — Mark as timed out."""
        try:
            game_round = GameService.timeout_round(pk)
            return Response(RoundSerializer(game_round).data)
        except Round.DoesNotExist:
            return Response({'error': 'Round not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='skip')
    def skip(self, request, pk=None):
        """POST /api/rounds/{id}/skip/ — Skip round."""
        try:
            game_round = GameService.skip_round(pk)
            return Response(RoundSerializer(game_round).data)
        except Round.DoesNotExist:
            return Response({'error': 'Round not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='next-round')
    def next_round(self, request):
        """POST /api/rounds/next-round/ — Advance to next round."""
        game_code = request.data.get('game_code', '')
        try:
            result = GameService.advance_to_next_round(game_code)
            if result['finished']:
                return Response({
                    'finished': True,
                    'game': GameSerializer(result['game']).data,
                })
            return Response({
                'finished': False,
                'round': RoundSerializer(result['round']).data,
            })
        except Game.DoesNotExist:
            return Response({'error': 'Game not found'}, status=status.HTTP_404_NOT_FOUND)
