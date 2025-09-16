from collections import OrderedDict

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

# rest_framework pagination
# https://www.django-rest-framework.org/api-guide/pagination/#pagenumberpagination

# todo: consider using cursor-based pagination
# https://www.django-rest-framework.org/api-guide/pagination/#cursorpagination

# todo: maipl common package
class MaiplPagination(PageNumberPagination):
    max_page_size = 100 # maximum allowed page size
    page_size = 100 # default page size, if not specified
    page_size_query_param = 'size'  # query parameter for page size override


    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'data': {
                    'type': 'array',
                    'items': schema,
                },
                'page': {'type': 'integer'},
                'size': {'type': 'integer'},
                'count': {'type': 'integer'},
                'prev': {'type': ['integer', 'null']},
                'next': {'type': ['integer', 'null']},
            },
        }

    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('data', data),
            ('page', self.page.number),
            ('size', self.page.paginator.per_page),
            ('count', self.page.paginator.count),
            ('prev', self.page.previous_page_number() if self.page.has_previous() else None),
            ('next', self.page.next_page_number() if self.page.has_next() else None),
        ]))


from drf_yasg import openapi
from drf_yasg.inspectors import PaginatorInspector


class MaiplPaginatorInspector(PaginatorInspector):

    def get_paginator_parameters(self, paginator):
        return [
            openapi.Parameter('page', in_=openapi.IN_QUERY, type=openapi.TYPE_INTEGER, description='Page number'),
            openapi.Parameter('size', in_=openapi.IN_QUERY, type=openapi.TYPE_INTEGER, description='Page size'),
        ]

    def get_paginated_response(self, paginator, response_schema):
        paged_schema = openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties=OrderedDict((
                ('data', response_schema),
                ('page', openapi.Schema(type=openapi.TYPE_INTEGER)),
                ('size', openapi.Schema(type=openapi.TYPE_INTEGER)),
                ('count', openapi.Schema(type=openapi.TYPE_INTEGER)),
                ('prev', openapi.Schema(type=openapi.TYPE_INTEGER, nullable=True)),
                ('next', openapi.Schema(type=openapi.TYPE_INTEGER, nullable=True)),
            )),
            required=['data']
        )
        return paged_schema


