import django.db.models.deletion
import uuid
from django.db import migrations, models
import game.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('name_ar', models.CharField(blank=True, default='', max_length=200)),
                ('genre', models.CharField(choices=[('movies', 'Movies'), ('actors', 'Actors'), ('tv_shows', 'TV Shows'), ('anime', 'Anime'), ('sports', 'Sports'), ('celebrities', 'Celebrities'), ('video_games', 'Video Games'), ('general', 'General')], default='general', max_length=50)),
                ('sub_genre', models.CharField(blank=True, default='', max_length=100)),
                ('difficulty', models.CharField(choices=[('easy', 'Easy'), ('medium', 'Medium'), ('hard', 'Hard')], default='medium', max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('icon', models.CharField(default='\U0001f3ac', help_text='Emoji or icon identifier', max_length=10)),
            ],
            options={
                'verbose_name_plural': 'Categories',
                'ordering': ['genre', 'name'],
            },
        ),
        migrations.CreateModel(
            name='Game',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('code', models.CharField(db_index=True, default=game.models.generate_game_code, max_length=6, unique=True)),
                ('status', models.CharField(choices=[('lobby', 'Lobby'), ('in_progress', 'In Progress'), ('finished', 'Finished')], default='lobby', max_length=20)),
                ('current_round', models.IntegerField(default=0)),
                ('total_rounds', models.IntegerField(default=10)),
                ('max_time_per_turn', models.IntegerField(default=240, help_text='Seconds per turn')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('settings', models.JSONField(blank=True, default=dict, help_text='Flexible settings for future features')),
                ('selected_categories', models.ManyToManyField(blank=True, related_name='games', to='game.category')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Prompt',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=300)),
                ('title_ar', models.CharField(blank=True, default='', max_length=300)),
                ('image_url', models.URLField(blank=True, default='', max_length=500)),
                ('image', models.ImageField(blank=True, null=True, upload_to='prompts/')),
                ('difficulty', models.IntegerField(default=3, help_text='1-5 difficulty scale')),
                ('times_used', models.IntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('metadata', models.JSONField(blank=True, default=dict, help_text='Extra info: year, actors, etc.')),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='prompts', to='game.category')),
            ],
            options={
                'ordering': ['category', 'title'],
            },
        ),
        migrations.CreateModel(
            name='Team',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('color', models.CharField(default='#3B82F6', help_text='Hex color for UI', max_length=7)),
                ('total_score', models.IntegerField(default=0)),
                ('order', models.IntegerField(default=1, help_text='1 or 2, determines turn order')),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='teams', to='game.game')),
            ],
            options={
                'ordering': ['order'],
                'unique_together': {('game', 'order')},
            },
        ),
        migrations.CreateModel(
            name='Player',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('session_key', models.CharField(db_index=True, max_length=255, unique=True)),
                ('is_host', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='players', to='game.game')),
                ('team', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='players', to='game.team')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='Round',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('round_number', models.IntegerField()),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('selecting_category', 'Selecting Category'), ('selecting_actor', 'Selecting Actor'), ('showing_qr', 'Showing QR'), ('actor_ready', 'Actor Ready'), ('active', 'Active'), ('guessed', 'Guessed'), ('timeout', 'Timeout'), ('skipped', 'Skipped')], default='pending', max_length=30)),
                ('token', models.CharField(blank=True, db_index=True, default='', help_text='Secure token for actor QR', max_length=255)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('ended_at', models.DateTimeField(blank=True, null=True)),
                ('time_taken_seconds', models.FloatField(blank=True, null=True)),
                ('points_awarded', models.IntegerField(default=0)),
                ('metadata', models.JSONField(blank=True, default=dict, help_text='Power-up effects, multipliers, etc.')),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='acted_rounds', to='game.player')),
                ('category', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='rounds', to='game.category')),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='rounds', to='game.game')),
                ('prompt', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='rounds', to='game.prompt')),
                ('team', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='rounds', to='game.team')),
            ],
            options={
                'ordering': ['round_number'],
                'unique_together': {('game', 'round_number')},
            },
        ),
    ]
