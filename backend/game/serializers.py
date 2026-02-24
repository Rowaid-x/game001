"""DRF serializers for 001 Game."""
from rest_framework import serializers
from .models import Game, Team, Player, Category, Prompt, Round


class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ['id', 'name', 'is_host', 'team', 'created_at']
        read_only_fields = ['id', 'created_at']


class TeamSerializer(serializers.ModelSerializer):
    players = PlayerSerializer(many=True, read_only=True)

    class Meta:
        model = Team
        fields = ['id', 'name', 'color', 'total_score', 'order', 'players']
        read_only_fields = ['id', 'total_score']


class CategorySerializer(serializers.ModelSerializer):
    prompt_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'name_ar', 'genre', 'sub_genre', 'difficulty', 'icon', 'prompt_count']

    def get_prompt_count(self, obj):
        return obj.prompts.filter(is_active=True).count()


class PromptSerializer(serializers.ModelSerializer):
    image_display_url = serializers.SerializerMethodField()

    class Meta:
        model = Prompt
        fields = ['id', 'title', 'title_ar', 'image_url', 'image_display_url', 'difficulty', 'category']

    def get_image_display_url(self, obj):
        return obj.get_image_display_url()


class RoundSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)
    team_color = serializers.CharField(source='team.color', read_only=True)
    actor_name = serializers.CharField(source='actor.name', read_only=True, default=None)
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    category_icon = serializers.CharField(source='category.icon', read_only=True, default=None)

    class Meta:
        model = Round
        fields = [
            'id', 'round_number', 'team', 'team_name', 'team_color',
            'actor', 'actor_name', 'category', 'category_name', 'category_icon',
            'status', 'started_at', 'ended_at', 'time_taken_seconds',
            'points_awarded', 'token',
        ]
        read_only_fields = ['id', 'started_at', 'ended_at', 'time_taken_seconds', 'points_awarded']


class GameSerializer(serializers.ModelSerializer):
    teams = TeamSerializer(many=True, read_only=True)
    unassigned_players = serializers.SerializerMethodField()
    current_round_data = serializers.SerializerMethodField()
    selected_categories = CategorySerializer(many=True, read_only=True)

    class Meta:
        model = Game
        fields = [
            'id', 'code', 'status', 'current_round', 'total_rounds',
            'max_time_per_turn', 'created_at', 'teams', 'unassigned_players',
            'current_round_data', 'selected_categories', 'settings',
        ]
        read_only_fields = ['id', 'code', 'created_at']

    def get_unassigned_players(self, obj):
        players = obj.players.filter(team__isnull=True)
        return PlayerSerializer(players, many=True).data

    def get_current_round_data(self, obj):
        if obj.status != 'in_progress':
            return None
        round_obj = obj.rounds.filter(round_number=obj.current_round).first()
        if round_obj:
            return RoundSerializer(round_obj).data
        return None


class CreateGameSerializer(serializers.Serializer):
    host_name = serializers.CharField(max_length=100)


class JoinGameSerializer(serializers.Serializer):
    player_name = serializers.CharField(max_length=100)


class AssignPlayerSerializer(serializers.Serializer):
    player_id = serializers.UUIDField()
    team_id = serializers.UUIDField()


class UpdateTeamSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, required=False)
    color = serializers.CharField(max_length=7, required=False)


class GameSettingsSerializer(serializers.Serializer):
    total_rounds = serializers.IntegerField(min_value=1, max_value=50, required=False)
    max_time_per_turn = serializers.IntegerField(min_value=30, max_value=600, required=False)
    category_ids = serializers.ListField(child=serializers.UUIDField(), required=False)


class SelectActorSerializer(serializers.Serializer):
    player_id = serializers.UUIDField()


class SelectCategorySerializer(serializers.Serializer):
    category_id = serializers.UUIDField()
