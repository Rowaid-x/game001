"""Database models for 001 Game."""
import uuid
import string
import random
from django.db import models
from django.utils import timezone


def generate_game_code():
    """Generate a unique 6-character alphanumeric game code."""
    chars = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(random.choices(chars, k=6))
        if not Game.objects.filter(code=code).exists():
            return code


class Game(models.Model):
    STATUS_CHOICES = [
        ('lobby', 'Lobby'),
        ('in_progress', 'In Progress'),
        ('finished', 'Finished'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=6, unique=True, default=generate_game_code, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='lobby')
    current_round = models.IntegerField(default=0)
    total_rounds = models.IntegerField(default=10)
    max_time_per_turn = models.IntegerField(default=240, help_text='Seconds per turn')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    settings = models.JSONField(default=dict, blank=True, help_text='Flexible settings for future features')
    selected_categories = models.ManyToManyField('Category', blank=True, related_name='games')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Game {self.code} ({self.status})"


class Team(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='teams')
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#3B82F6', help_text='Hex color for UI')
    total_score = models.IntegerField(default=0)
    order = models.IntegerField(default=1, help_text='1 or 2, determines turn order')

    class Meta:
        ordering = ['order']
        unique_together = ['game', 'order']

    def __str__(self):
        return f"{self.name} (Game {self.game.code})"


class Player(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='players')
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name='players')
    name = models.CharField(max_length=100)
    session_key = models.CharField(max_length=255, db_index=True)
    is_host = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        unique_together = ['game', 'session_key']

    def __str__(self):
        return f"{self.name} (Game {self.game.code})"


class Category(models.Model):
    GENRE_CHOICES = [
        ('movies', 'Movies'),
        ('actors', 'Actors'),
        ('tv_shows', 'TV Shows'),
        ('anime', 'Anime'),
        ('sports', 'Sports'),
        ('celebrities', 'Celebrities'),
        ('video_games', 'Video Games'),
        ('general', 'General'),
    ]
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    name_ar = models.CharField(max_length=200, blank=True, default='')
    genre = models.CharField(max_length=50, choices=GENRE_CHOICES, default='general')
    sub_genre = models.CharField(max_length=100, blank=True, default='')
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='medium')
    is_active = models.BooleanField(default=True)
    icon = models.CharField(max_length=10, default='🎬', help_text='Emoji or icon identifier')

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['genre', 'name']

    def __str__(self):
        return f"{self.icon} {self.name}"


class Prompt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='prompts')
    title = models.CharField(max_length=300)
    title_ar = models.CharField(max_length=300, blank=True, default='')
    image_url = models.URLField(max_length=500, blank=True, default='')
    image = models.ImageField(upload_to='prompts/', blank=True, null=True)
    difficulty = models.IntegerField(default=3, help_text='1-5 difficulty scale')
    times_used = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True, help_text='Extra info: year, actors, etc.')

    class Meta:
        ordering = ['category', 'title']

    def __str__(self):
        return f"{self.title} ({self.category.name})"

    def get_image_display_url(self):
        """Return the best available image URL."""
        if self.image:
            return self.image.url
        return self.image_url or ''


class Round(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('selecting_category', 'Selecting Category'),
        ('selecting_actor', 'Selecting Actor'),
        ('showing_qr', 'Showing QR'),
        ('prompt_reveal', 'Prompt Reveal'),
        ('actor_ready', 'Actor Ready'),
        ('active', 'Active'),
        ('guessed', 'Guessed'),
        ('timeout', 'Timeout'),
        ('skipped', 'Skipped'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='rounds')
    round_number = models.IntegerField()
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='rounds')
    actor = models.ForeignKey(Player, on_delete=models.SET_NULL, null=True, blank=True, related_name='acted_rounds')
    prompt = models.ForeignKey(Prompt, on_delete=models.SET_NULL, null=True, blank=True, related_name='rounds')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='rounds')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    token = models.CharField(max_length=255, blank=True, default='', db_index=True, help_text='Secure token for actor QR')
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    time_taken_seconds = models.FloatField(null=True, blank=True)
    points_awarded = models.IntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True, help_text='Power-up effects, multipliers, etc.')

    class Meta:
        ordering = ['round_number']
        unique_together = ['game', 'round_number']

    def __str__(self):
        return f"Round {self.round_number} - Game {self.game.code}"
