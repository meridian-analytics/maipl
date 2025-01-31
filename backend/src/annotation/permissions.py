from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Batch, UserRoleBatch
from django.contrib.auth import get_user_model


class AnnotationPermission(BasePermission):
    """
    Custom permission to check the permissions of the batch that the annotation belongs to
    """

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):

        batch_id = view.kwargs.get("batch_id")
        batch = Batch.objects.get(id=batch_id)
        user = get_user_model().objects.get(id=request.user.id)

        if user.id == batch.user_id.id:
            return True
        
        try:
            user_role = UserRoleBatch.objects.get(user=user, batch=batch)

            if request.method in SAFE_METHODS:
                return (
                    user_role.role.code == 1 or user_role.role.code == 2 or user_role.role.code == 3 or user_role.role.code == 4
                )
            elif request.method in ["PUT"]:
                return (
                    user_role.role.code == 2 or user_role.role.code == 3 or user_role.role.code == 4
                )
            else:
                return False
        except UserRoleBatch.DoesNotExist:
            return False

class UserCan:
    """
    A class to check if the user has permission to view, edit, or delete annotations
    """

    @staticmethod
    def view_all_annotations(user, batch):
        # check if the user is the owner
        if user.id == batch.user_id.id:
            return True
        # check if the user is with role code 1 or 3 or 4
        user_role = UserRoleBatch.objects.get(user=user, batch=batch).role
        if user_role.code == 1 or user_role.code == 3 or user_role.code == 4:
            return True
        return False

    @staticmethod
    def view_annotation(user, batch):
        # check if the user is with role code 2
        user_role = UserRoleBatch.objects.get(user=user, batch=batch).role
        if user_role.code == 2:
            return True
        return False

    @staticmethod
    def edit_all_annotations(user, batch):
        # check if the user is the owner
        if user.id == batch.user_id.id:
            return True
        # check if the user is with role code 4
        user_role = UserRoleBatch.objects.get(user=user, batch=batch).role
        if user_role.code == 4:
            return True
        return False

    @staticmethod
    def edit_annotation(user, batch):
        # check if the user is with role code 3
        user_role = UserRoleBatch.objects.get(user=user, batch=batch).role
        if user_role.code == 3 or user_role.code == 2:
            return True
        return False

    @staticmethod
    def delete_all_annotations(user, batch):
        # check if the user is the owner
        if user.id == batch.user_id.id:
            return True
        # check if the user is with role code 4
        user_role = UserRoleBatch.objects.get(user=user, batch=batch).role
        if user_role.code == 4:
            return True
        return False

    @staticmethod
    def delete_annotation(user, batch):
        # check if the user is with role code 3 or 2
        user_role = UserRoleBatch.objects.get(user=user, batch=batch).role
        if user_role.code == 3 or user_role.code == 2:
            return True
        return False
