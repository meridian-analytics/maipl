from django.contrib import admin
from django.urls import include, path, re_path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions
from django.conf import settings
from django.conf.urls.static import static

schema_view = get_schema_view(
   openapi.Info(
      title="MAIPL API",
      default_version='v1',
      description="API documentation for MAIPL project",
      terms_of_service="https://www.maipl-dev.com/terms/",
      contact=openapi.Contact(email="yue.su@dal.ca"),
      license=openapi.License(name="BSD License"),
   ),
   public=True,
   permission_classes=(permissions.IsAuthenticatedOrReadOnly,),
)

urlpatterns = [
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    re_path(r'^swagger/$', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    re_path(r'^redoc/$', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('admin/', admin.site.urls),
    path('api/', include('user.urls', namespace='user')),
    path('api/file/', include('file.urls', namespace='file')),
    path('api/annotation/', include('annotation.urls', namespace='annotation')),
    path('api/ketos/run/', include('modelrunner.urls', namespace='runner')),
    path('api/ketos/train/', include('modeltrainer.urls', namespace='trainer')),
    path('api/ketos/metrics/', include('metrics.urls', namespace='metrics')),
]
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
