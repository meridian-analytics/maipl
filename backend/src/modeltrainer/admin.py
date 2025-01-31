from django.contrib import admin

# Register your models here.
from .models import TrainingTask

class TrainingTaskAdmin(admin.ModelAdmin):  
    list_display = ('id', 'description', 'user_id', 'model_file', 'status', 'created_at', 'updated_at')
    list_filter = ('user_id', 'status')

admin.site.register(TrainingTask, TrainingTaskAdmin)