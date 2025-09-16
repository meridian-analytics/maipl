from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.response import Response


# for use with Serializers
class CreatorMixin:
    def create(self, validated_data):
        User = get_user_model()
        user = User.objects.get(id=self.context['request'].user.id)
        validated_data['user_id'] = user
        return super().create(validated_data)

# for use with ViewSets
class CreateListModelMixin(object):
    def get_serializer(self, *args, **kwargs):
        """ if an array is passed, set serializer to many """
        if isinstance(kwargs.get('data', {}), list):
            kwargs['many'] = True
        return super(CreateListModelMixin, self).get_serializer(*args, **kwargs)

# for use with ViewSets
class DeleteByIdsMixin:
    def delete(self, request, *args, **kwargs):
        ids = request.query_params.get('ids').split(',')
        if ids:
            queryset = self.queryset.filter(id__in=ids)
            queryset.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
