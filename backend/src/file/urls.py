from django.urls import path

from .views import FileDetailView, FileFolderView, FileListView, SetFilesSharedView

app_name = "file"

urlpatterns = [
    path("", FileListView.as_view(), name="list"),
    path("folder/", FileFolderView.as_view(), name="folder"),
    path("<int:pk>/", FileDetailView.as_view(), name="detail"),
    path("share/", SetFilesSharedView.as_view(), name="set-files-shared"),
]
