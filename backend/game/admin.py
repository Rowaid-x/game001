"""Django admin configuration for 001 Game."""
import csv
import io
from django.contrib import admin
from django.utils.html import format_html
from django import forms
from .models import Game, Team, Player, Category, Prompt, Round


class TeamInline(admin.TabularInline):
    model = Team
    extra = 0
    readonly_fields = ['total_score']


class PlayerInline(admin.TabularInline):
    model = Player
    extra = 0
    readonly_fields = ['session_key', 'created_at']


class RoundInline(admin.TabularInline):
    model = Round
    extra = 0
    readonly_fields = ['started_at', 'ended_at', 'time_taken_seconds', 'points_awarded']
    fields = ['round_number', 'team', 'actor', 'category', 'prompt', 'status', 'points_awarded']


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ['code', 'status', 'current_round', 'total_rounds', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['code']
    readonly_fields = ['id', 'code', 'created_at', 'updated_at']
    inlines = [TeamInline, PlayerInline, RoundInline]


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'game', 'color_preview', 'total_score', 'order']
    list_filter = ['game__code']

    def color_preview(self, obj):
        return format_html(
            '<span style="background:{}; padding: 2px 12px; border-radius: 3px;">&nbsp;</span> {}',
            obj.color, obj.color
        )
    color_preview.short_description = 'Color'


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ['name', 'game', 'team', 'is_host', 'created_at']
    list_filter = ['is_host', 'game__code']
    search_fields = ['name']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['icon', 'name', 'name_ar', 'genre', 'sub_genre', 'difficulty', 'prompt_count', 'is_active']
    list_filter = ['genre', 'difficulty', 'is_active']
    search_fields = ['name', 'name_ar']

    def prompt_count(self, obj):
        return obj.prompts.filter(is_active=True).count()
    prompt_count.short_description = 'Active Prompts'


class CsvImportForm(forms.Form):
    csv_file = forms.FileField(label='CSV File (columns: title, title_ar, category_name, image_url, difficulty)')


@admin.register(Prompt)
class PromptAdmin(admin.ModelAdmin):
    list_display = ['title', 'title_ar', 'category', 'difficulty', 'image_preview', 'times_used', 'is_active']
    list_filter = ['category', 'difficulty', 'is_active']
    search_fields = ['title', 'title_ar']
    readonly_fields = ['times_used', 'image_preview_large']
    change_list_template = 'admin/prompt_changelist.html'

    def image_preview(self, obj):
        url = obj.get_image_display_url()
        if url:
            return format_html('<img src="{}" style="max-height:40px; max-width:60px; object-fit:cover;" />', url)
        return '-'
    image_preview.short_description = 'Image'

    def image_preview_large(self, obj):
        url = obj.get_image_display_url()
        if url:
            return format_html('<img src="{}" style="max-height:200px; max-width:300px; object-fit:contain;" />', url)
        return 'No image'
    image_preview_large.short_description = 'Image Preview'

    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path('import-csv/', self.import_csv, name='prompt_import_csv'),
        ]
        return custom_urls + urls

    def import_csv(self, request):
        from django.shortcuts import redirect, render
        from django.contrib import messages

        if request.method == 'POST':
            form = CsvImportForm(request.POST, request.FILES)
            if form.is_valid():
                csv_file = form.cleaned_data['csv_file']
                decoded = csv_file.read().decode('utf-8')
                reader = csv.DictReader(io.StringIO(decoded))
                count = 0
                for row in reader:
                    category = Category.objects.filter(name=row.get('category_name', '')).first()
                    if category:
                        Prompt.objects.create(
                            title=row.get('title', ''),
                            title_ar=row.get('title_ar', ''),
                            category=category,
                            image_url=row.get('image_url', ''),
                            difficulty=int(row.get('difficulty', 3)),
                        )
                        count += 1
                messages.success(request, f'Successfully imported {count} prompts.')
                return redirect('..')
        else:
            form = CsvImportForm()

        return render(request, 'admin/csv_import.html', {'form': form, 'title': 'Import Prompts from CSV'})


@admin.register(Round)
class RoundAdmin(admin.ModelAdmin):
    list_display = ['game', 'round_number', 'team', 'actor', 'status', 'time_taken_seconds', 'points_awarded']
    list_filter = ['status', 'game__code']
    readonly_fields = ['started_at', 'ended_at']
