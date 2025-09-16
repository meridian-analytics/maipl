from django.contrib import admin
from .models import DatabaseTask, DatabaseGroup


class DatabaseGroupInline(admin.TabularInline):
    """Inline admin for DatabaseGroup within DatabaseTask."""
    model = DatabaseGroup
    extra = 0
    readonly_fields = ['created_at']
    fields = ['name', 'status', 'source', 'created_at', 'file_count', 'label_count', 'total_samples']


@admin.register(DatabaseTask)
class DatabaseTaskAdmin(admin.ModelAdmin):
    """Admin interface for DatabaseTask model."""
    
    list_display = ['id', 'task_name', 'user', 'status', 'celery_task_id', 'created_at', 'groups_count', 'total_samples']
    list_filter = ['status', 'created_at', 'user']
    search_fields = ['id', 'task_name', 'description', 'celery_task_id']
    readonly_fields = ['created_at', 'updated_at', 'groups_count', 'total_samples']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'task_name', 'description', 'user', 'status', 'celery_task_id')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Database Configuration', {
            'fields': ('database_selection', 'database_file', 'output_settings', 'database_metadata'),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('groups_count', 'total_samples'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [DatabaseGroupInline]
    
    def groups_count(self, obj):
        """Display the number of groups."""
        return obj.groups_count
    groups_count.short_description = 'Groups'
    
    def total_samples(self, obj):
        """Display the total samples across all groups."""
        return obj.total_samples
    total_samples.short_description = 'Total Samples'


@admin.register(DatabaseGroup)
class DatabaseGroupAdmin(admin.ModelAdmin):
    """Admin interface for DatabaseGroup model."""
    
    list_display = ['name', 'task', 'status', 'source', 'celery_task_id', 'created_at', 'file_count', 'label_count', 'total_samples']
    list_filter = ['status', 'source', 'created_at', 'task']
    search_fields = ['name', 'task__id', 'task__task_name', 'celery_task_id']
    readonly_fields = ['created_at', 'file_count', 'label_count', 'total_samples']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'task', 'status', 'source', 'celery_task_id')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
        ('Configuration', {
            'fields': ('config',),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('statistics', 'file_count', 'label_count', 'total_samples'),
            'classes': ('collapse',)
        }),
    )
    
    def file_count(self, obj):
        """Display the number of files."""
        return obj.file_count
    file_count.short_description = 'Files'
    
    def label_count(self, obj):
        """Display the number of labels."""
        return obj.label_count
    label_count.short_description = 'Labels'
    
    def total_samples(self, obj):
        """Display the total samples."""
        return obj.total_samples
    total_samples.short_description = 'Total Samples'
