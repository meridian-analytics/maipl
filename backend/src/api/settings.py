import os
from datetime import timedelta
from pathlib import Path

# environment helpers
def getenv(key, default=None):
    s = os.getenv(key)
    return s if s else default


def getenvbool(key, default=False):
    s = getenv(key, "false")
    return s.lower() in ("true", "1") if s else default


def getenvlist(key, default=[]):
    s = getenv(key, "")
    return s.split(",") if s else default

DJANGO_ENV = getenv("DJANGO_ENV", "dev")
DEBUG = getenvbool("DEBUG", DJANGO_ENV == "dev")

# Demo environment flag - determines whether this instance is a demo environment
IS_DEMO_ENVIRONMENT = getenvbool("IS_DEMO_ENVIRONMENT", False)

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Static files (CSS, JavaScript, Images)
STATIC_ROOT = os.path.join(BASE_DIR, "static")

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = getenv("DJANGO_SECRET_KEY", "tempkeyfordev")


# Allowed hosts
# https://docs.djangoproject.com/en/4.2/ref/settings/#allowed-hosts
ALLOWED_HOSTS = getenvlist("DJANGO_ALLOWED_HOSTS")

# Csrf
# https://docs.djangoproject.com/en/4.2/ref/settings/#csrf-trusted-origins
CSRF_TRUSTED_ORIGINS = getenvlist("DJANGO_CSRF_TRUSTED_ORIGINS")

# Corsheaders
CORS_ALLOW_ALL_ORIGINS = getenvbool("CORS_ALLOW_ALL_ORIGINS", False)
CORS_ALLOWED_ORIGINS = getenvlist("CORS_ALLOWED_ORIGINS")

# Auth user
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-user-model
AUTH_USER_MODEL = "user.User"

# logging
BASE_LOGS = os.environ.get("BASE_LOGS", "/logs/")
LOGS_ROOT = BASE_LOGS

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
        },
    },
}


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
    "constance",
    "django_minio_backend.apps.DjangoMinioBackendConfig",
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt",
    "corsheaders",
    "user",
    "file",
    "annotation",
    "modelrunner",
    "modeltrainer",
    'metrics',
    "common",
    "drf_yasg",
    "django_celery_results",
    "django_filters",
    "guardian",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "api.middleware.DemoEnvironmentMiddleware",  # Demo environment middleware
]

ROOT_URLCONF = "api.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "api.wsgi.application"


# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql_psycopg2",
        "NAME": getenv("POSTGRES_DB", "maipl-dev"),
        "USER": getenv("POSTGRES_USER", "user"),
        "PASSWORD": getenv("POSTGRES_PASSWORD", "password"),
        "HOST": getenv("POSTGRES_HOST", "db"),
        "PORT": getenv("POSTGRES_PORT", "5432"),
    }
}

CONSTANCE_BACKEND = "constance.backends.database.DatabaseBackend"
CONSTANCE_SUPERUSER_ONLY = False
CONSTANCE_CONFIG = {
    "ALLOWED_REDIRECT_URLS": (
        getenv("ALLOWED_REDIRECT_URLS", ""),
        "Allowed redirect urls(read-only field)",
    ),
    "ANNOTATION_CONTENT_TYPE": ("text/csv", "Annotation content type"),
    "CONFIG_CONTENT_TYPE": ("application/json", "Config content type"),
    "RAW_CONTENT_TYPE": ("audio/wav,audio/flac", "Raw content type"),
    "MODEL_CONTENT_TYPE": ("application/octet-stream", "Model content type"),
    "METRICS_CONTENT_TYPE": ("text/csv", "Metrics content type"),
    "DATASET_CONTENT_TYPE": ("application/octet-stream", "Dataset content type"),
    "RECIPE_CONTENT_TYPE": ("application/json", "Recipe content type"),
    "REQUIRED_ANNOTATION_COLUMNS": (
        "filename,start,end,label",
        "Required annotation columns",
    ),
    "USE_MOCK_TRAINING": (
        False,
        "Use mock training",
    ),
    "USE_MOCK_RUN": (
        False,
        "Use mock run",
    ),
    "USE_MOCK_DATASET_CREATION": (
        False,
        "Use mock dataset creation",
    ),
}
CONSTANCE_CONFIG_FIELDSETS = {
    "Site Config": ("ALLOWED_REDIRECT_URLS",),
    "Folder Content Type": (
        "ANNOTATION_CONTENT_TYPE",
        "CONFIG_CONTENT_TYPE",
        "RAW_CONTENT_TYPE",
        "MODEL_CONTENT_TYPE",
        "METRICS_CONTENT_TYPE",
        "DATASET_CONTENT_TYPE",
        "RECIPE_CONTENT_TYPE", 
    ),
    "Required Annotation Columns": ("REQUIRED_ANNOTATION_COLUMNS",),
    "Mock Services": ("USE_MOCK_TRAINING", "USE_MOCK_RUN", "USE_MOCK_DATASET_CREATION"),
}

# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = "static/"
STATIC_ROOT = os.path.join(BASE_DIR, "static")

# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Django Rest Framework
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTStatelessUserAuthentication",
        # this line is added to get docs/ endpoint working properly as it relies on session auth
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
    ],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
    "ALGORITHM": "HS256",
    "AUTH_HEADER_TYPES": ("JWT",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "BLACKLIST_AFTER_ROTATION": True,
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "SIGNING_KEY": SECRET_KEY,
    "TOKEN_TYPE_CLAIM": "token_type",
    "USER_ID_CLAIM": "user_id",
    "USER_ID_FIELD": "id",
    "VERIFYING_KEY": None,
}

# Email settings

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = getenv("EMAIL_HOST", "")
EMAIL_PORT = getenv("EMAIL_PORT", 465)
EMAIL_HOST_USER = getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = getenvbool("EMAIL_USE_TLS", False)
EMAIL_USE_SSL = getenvbool("EMAIL_USE_SSL", True)
DEFAULT_FROM_EMAIL = getenv("DEFAULT_FROM_EMAIL", "")


# Frontend settings

AUTH_FRONTEND_URL = getenv("AUTH_FRONTEND_URL", "http://localhost:3000")


# Storages
# https://docs.djangoproject.com/en/4.2/ref/settings/#storages
# django >=4.2
STORAGES = {
    "default": {
        "BACKEND": "django_minio_backend.MinioBackend",
        "OPTIONS": {"bucket_name": getenv("MINIO_PRIVATE_BUCKETS", "maipl-dev")},
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}


# django_minio_backend
# https://github.com/theriverman/django-minio-backend
MINIO_ENDPOINT = getenv("MINIO_ENDPOINT", "play.min.io")
MINIO_EXTERNAL_ENDPOINT = getenv("MINIO_EXTERNAL_ENDPOINT", MINIO_ENDPOINT)
MINIO_ACCESS_KEY = getenv("MINIO_ACCESS_KEY", "minio-unset-access-key")
MINIO_SECRET_KEY = getenv("MINIO_SECRET_KEY", "minio-unset-secret-key")
MINIO_EXTERNAL_ENDPOINT_USE_HTTPS = getenvbool(
    "MINIO_EXTERNAL_ENDPOINT_USE_HTTPS", True
)
MINIO_BUCKET_NAME = getenv("MINIO_BUCKET_NAME", "maipl-dev")
MINIO_PRIVATE_BUCKETS = getenvlist("MINIO_PRIVATE_BUCKETS", [MINIO_BUCKET_NAME])
MINIO_CONSISTENCY_CHECK_ON_START = getenvbool("MINIO_CONSISTENCY_CHECK_ON_START", True)
MINIO_BUCKET_CHECK_ON_SAVE = getenvbool("MINIO_BUCKET_CHECK_ON_SAVE", True)
MINIO_POLICY_HOOKS = []
MINIO_PUBLIC_BUCKETS = getenvlist("MINIO_PUBLIC_BUCKETS", [])
MINIO_STATIC_FILES_BUCKET = getenv("MINIO_STATIC_FILES_BUCKET", "static")
MINIO_URL_EXPIRY_HOURS = timedelta(days=7)
MINIO_USE_HTTPS = getenvbool("MINIO_USE_HTTPS", True)
MINIO_USE_HTTPS_FOR_INTERNAL = getenvbool(
    "MINIO_USE_HTTPS_FOR_INTERNAL", False)
# Disable auto bucket creation - this prevents the plugin from creating buckets automatically
MINIO_AUTO_CREATE_MEDIA_BUCKET = False
MINIO_AUTO_CREATE_STATIC_BUCKET = False

# Swagger settings
SWAGGER_SETTINGS = {
    "DEFAULT_PAGINATOR_INSPECTORS": ["common.pagination.MaiplPaginatorInspector"],
}

# Celery Settings
protocol = getenv("CELERY_BROKER_URL_PROTOCOL", "amqp")
user = getenv("CELERY_BROKER_URL_USER", "rabbitmq")
password = getenv("CELERY_BROKER_URL_PASSWORD", "rabbitmq")
host = getenv("CELERY_BROKER_URL_HOST", "rabbit")
port = getenv("CELERY_BROKER_URL_PORT", "5672")

# Construct the broker URL
CELERY_BROKER_URL = f"{protocol}://{user}:{password}@{host}:{port}//"

CELERY_ACCEPT_CONTENT = ["application/json"]
CELERY_RESULT_SERIALIZER = "json"
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_BACKEND = "django-db"
CELERY_CACHE_BACKEND = "django-cache"

# File cache
FILE_CACHE_DIR = "/cache"
FILE_CACHE_MAX_ITEMS = 1000

# Tasks local storage
TASKS_LOCAL_STORAGE = "/tasks"

# Redis
redis_host = getenv("REDIS_HOST", "redis")
redis_port = getenv("REDIS_PORT", "6379")
redis_db = getenv("REDIS_DB", "0")

REDIS_URL = f"redis://{redis_host}:{redis_port}/{redis_db}"

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "SOCKET_CONNECT_TIMEOUT": 5,
            "SOCKET_TIMEOUT": 5,
        },
        "KEY_PREFIX": "django_cache",
    }
}

AUTHENTICATION_BACKENDS = (
    "django.contrib.auth.backends.ModelBackend",  # this is default
    "guardian.backends.ObjectPermissionBackend",
)

