"""WebSocket consumers for 001 Game.

Consumers are thin — they receive events and delegate to GameService.
"""
import json
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from .services import GameService
from .serializers import GameSerializer, RoundSerializer

logger = logging.getLogger('game')


class GameConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for game events."""

    async def connect(self):
        self.game_code = self.scope['url_route']['kwargs']['code'].upper()
        self.group_name = f'game_{self.game_code}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        try:
            state = await self._get_game_state()
            await self.send_json({
                'type': 'game_state',
                'version': 1,
                'data': state,
            })
        except Exception as e:
            logger.error(f"Error sending initial state: {e}")
            await self.send_json({'type': 'error', 'message': 'Game not found'})

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        """Route incoming messages to handlers."""
        msg_type = content.get('type', '')
        handler = getattr(self, f'handle_{msg_type}', None)

        if handler:
            try:
                await handler(content)
            except Exception as e:
                logger.error(f"Error handling {msg_type}: {e}")
                await self.send_json({
                    'type': 'error',
                    'version': 1,
                    'message': str(e),
                })
        else:
            await self.send_json({
                'type': 'error',
                'version': 1,
                'message': f'Unknown message type: {msg_type}',
            })

    async def handle_join_game(self, content):
        player_name = content.get('player_name', '')
        session_key = content.get('session_key', '')

        player = await self._join_game(player_name, session_key)

        await self.channel_layer.group_send(self.group_name, {
            'type': 'broadcast_player_joined',
            'player': {'id': str(player.id), 'name': player.name},
        })

    async def handle_add_player(self, content):
        player_name = content.get('player_name', '')
        team_id = content.get('team_id', '')

        player = await self._host_add_player(player_name, team_id)
        state = await self._get_game_state()

        await self.channel_layer.group_send(self.group_name, {
            'type': 'broadcast_team_updated',
            'data': state,
        })

    async def handle_assign_player(self, content):
        player_id = content.get('player_id', '')
        team_id = content.get('team_id', '')

        await self._assign_player(player_id, team_id)
        state = await self._get_game_state()

        await self.channel_layer.group_send(self.group_name, {
            'type': 'broadcast_team_updated',
            'data': state,
        })

    async def handle_update_team(self, content):
        team_id = content.get('team_id', '')
        name = content.get('name')
        color = content.get('color')

        await self._update_team(team_id, name, color)
        state = await self._get_game_state()

        await self.channel_layer.group_send(self.group_name, {
            'type': 'broadcast_team_updated',
            'data': state,
        })

    async def handle_start_game(self, content):
        game = await self._start_game()
        state = await self._get_game_state()

        await self.channel_layer.group_send(self.group_name, {
            'type': 'broadcast_game_started',
            'data': state,
        })

    async def handle_select_actor(self, content):
        round_id = content.get('round_id', '')
        player_id = content.get('player_id', '')

        await self._select_actor(round_id, player_id)
        state = await self._get_game_state()

        await self.channel_layer.group_send(self.group_name, {
            'type': 'broadcast_round_updated',
            'data': state,
        })

    async def handle_select_category(self, content):
        round_id = content.get('round_id', '')
        category_id = content.get('category_id', '')

        await self._select_category(round_id, category_id)
        state = await self._get_game_state()

        await self.channel_layer.group_send(self.group_name, {
            'type': 'broadcast_round_updated',
            'data': state,
        })

    async def handle_actor_ready(self, content):
        round_id = content.get('round_id', '')

        await self._actor_ready(round_id)
        state = await self._get_game_state()

        await self.channel_layer.group_send(self.group_name, {
            'type': 'broadcast_actor_ready',
            'data': state,
        })

    async def handle_start_timer(self, content):
        round_id = content.get('round_id', '')

        await self._start_timer(round_id)
        state = await self._get_game_state()

        await self.channel_layer.group_send(self.group_name, {
            'type': 'broadcast_timer_started',
            'data': state,
        })

    async def handle_correct_guess(self, content):
        round_id = content.get('round_id', '')

        result = await self._correct_guess(round_id)
        state = await self._get_game_state()

        await self.channel_layer.group_send(self.group_name, {
            'type': 'broadcast_round_ended',
            'data': state,
            'result': {
                'time_taken': result['time_taken'],
                'points': result['points'],
                'team_score': result['team_score'],
                'status': 'guessed',
            },
        })

    async def handle_timeout(self, content):
        round_id = content.get('round_id', '')

        await self._timeout_round(round_id)
        state = await self._get_game_state()

        await self.channel_layer.group_send(self.group_name, {
            'type': 'broadcast_round_ended',
            'data': state,
            'result': {'status': 'timeout', 'points': 0},
        })

    async def handle_skip_round(self, content):
        round_id = content.get('round_id', '')

        await self._skip_round(round_id)
        state = await self._get_game_state()

        await self.channel_layer.group_send(self.group_name, {
            'type': 'broadcast_round_ended',
            'data': state,
            'result': {'status': 'skipped', 'points': 0},
        })

    async def handle_next_round(self, content):
        result = await self._next_round()

        if result['finished']:
            state = await self._get_game_state()
            await self.channel_layer.group_send(self.group_name, {
                'type': 'broadcast_game_finished',
                'data': state,
            })
        else:
            state = await self._get_game_state()
            await self.channel_layer.group_send(self.group_name, {
                'type': 'broadcast_round_updated',
                'data': state,
            })

    async def handle_update_settings(self, content):
        settings = {k: v for k, v in content.items() if k != 'type'}
        await self._update_settings(**settings)
        state = await self._get_game_state()

        await self.channel_layer.group_send(self.group_name, {
            'type': 'broadcast_settings_updated',
            'data': state,
        })

    # --- Broadcast handlers (called by channel_layer.group_send) ---

    async def broadcast_player_joined(self, event):
        await self.send_json({
            'type': 'player_joined',
            'version': 1,
            'player': event['player'],
        })

    async def broadcast_team_updated(self, event):
        await self.send_json({
            'type': 'team_updated',
            'version': 1,
            'data': event['data'],
        })

    async def broadcast_game_started(self, event):
        await self.send_json({
            'type': 'game_started',
            'version': 1,
            'data': event['data'],
        })

    async def broadcast_round_updated(self, event):
        await self.send_json({
            'type': 'round_updated',
            'version': 1,
            'data': event['data'],
        })

    async def broadcast_actor_ready(self, event):
        await self.send_json({
            'type': 'actor_ready',
            'version': 1,
            'data': event['data'],
        })

    async def broadcast_timer_started(self, event):
        await self.send_json({
            'type': 'timer_started',
            'version': 1,
            'data': event['data'],
        })

    async def broadcast_round_ended(self, event):
        await self.send_json({
            'type': 'round_ended',
            'version': 1,
            'data': event['data'],
            'result': event.get('result', {}),
        })

    async def broadcast_game_finished(self, event):
        await self.send_json({
            'type': 'game_finished',
            'version': 1,
            'data': event['data'],
        })

    async def broadcast_settings_updated(self, event):
        await self.send_json({
            'type': 'settings_updated',
            'version': 1,
            'data': event['data'],
        })

    # --- Database operations (sync_to_async wrappers) ---

    @database_sync_to_async
    def _get_game_state(self):
        return GameService.get_game_state(self.game_code)

    @database_sync_to_async
    def _join_game(self, player_name, session_key):
        return GameService.join_game(self.game_code, player_name, session_key)

    @database_sync_to_async
    def _host_add_player(self, player_name, team_id):
        return GameService.host_add_player(self.game_code, player_name, team_id or None)

    @database_sync_to_async
    def _assign_player(self, player_id, team_id):
        return GameService.assign_player_to_team(player_id, team_id)

    @database_sync_to_async
    def _update_team(self, team_id, name, color):
        return GameService.update_team(team_id, name, color)

    @database_sync_to_async
    def _start_game(self):
        return GameService.start_game(self.game_code)

    @database_sync_to_async
    def _select_actor(self, round_id, player_id):
        return GameService.select_actor(round_id, player_id)

    @database_sync_to_async
    def _select_category(self, round_id, category_id):
        return GameService.select_category(round_id, category_id)

    @database_sync_to_async
    def _actor_ready(self, round_id):
        return GameService.actor_ready(round_id)

    @database_sync_to_async
    def _start_timer(self, round_id):
        return GameService.start_timer(round_id)

    @database_sync_to_async
    def _correct_guess(self, round_id):
        return GameService.correct_guess(round_id)

    @database_sync_to_async
    def _timeout_round(self, round_id):
        return GameService.timeout_round(round_id)

    @database_sync_to_async
    def _skip_round(self, round_id):
        return GameService.skip_round(round_id)

    @database_sync_to_async
    def _next_round(self):
        return GameService.advance_to_next_round(self.game_code)

    @database_sync_to_async
    def _update_settings(self, **kwargs):
        return GameService.update_game_settings(self.game_code, **kwargs)
