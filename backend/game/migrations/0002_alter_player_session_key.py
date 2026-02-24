from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('game', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='player',
            name='session_key',
            field=models.CharField(db_index=True, max_length=255),
        ),
        migrations.AlterUniqueTogether(
            name='player',
            unique_together={('game', 'session_key')},
        ),
    ]
