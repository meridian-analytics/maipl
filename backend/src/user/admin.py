from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.db import models
from django.db.models import BigIntegerField, Count, Sum, Value
from django.db.models.functions import Coalesce
from django.forms import Textarea
from django.template.defaultfilters import filesizeformat

from user.models import User


class UserAdminConfig(UserAdmin):
    model = User
    search_fields = ('email', 'first_name', 'last_name')
    list_filter = ('email', 'first_name', 'last_name', 'is_active', 'is_staff', 'is_demo')
    ordering = ('-created_at',)
    list_display = ('id', 'email', 'first_name', 'last_name',
                    'storage_used', 'storage_file_count',
                    'is_active', 'is_staff', 'is_demo')
    fieldsets = (
        (None, {'fields': ('email', 'first_name', 'last_name',)}),
        ('Permissions', {'fields': ('is_staff', 'is_active', 'is_demo', 'groups')}),
    )
    formfield_overrides = {
        models.TextField: {'widget': Textarea(attrs={'rows': 20, 'cols': 60})},
    }
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2', 'is_active', 'is_staff')}
         ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _storage_used_bytes=Coalesce(
                Sum('file__size', output_field=BigIntegerField()),
                Value(0, output_field=BigIntegerField()),
            ),
            _storage_file_count=Count('file', distinct=True),
        )

    @admin.display(ordering='_storage_used_bytes', description='Storage used')
    def storage_used(self, obj):
        return filesizeformat(obj._storage_used_bytes)

    @admin.display(ordering='_storage_file_count', description='Files')
    def storage_file_count(self, obj):
        return obj._storage_file_count


admin.site.register(User, UserAdminConfig)
