class SortableMixin:
    sort_map = {}  # This should be overridden in subclasses.
    default_sort_field = None  # This can be overridden in subclass.

    def get_queryset(self):
        queryset = super().get_queryset()
        sort_fields = self.request.query_params.get('sort', self.default_sort_field)

        if sort_fields:
            ordering = []
            for sort_field in sort_fields.split(','):
                desc = sort_field.startswith('-')
                if desc:
                    sort_field = sort_field[1:]
                if sort_field in self.sort_map:
                    mapped_field = self.sort_map[sort_field]
                    if desc:
                        ordering.append('-' + mapped_field)
                    else:
                        ordering.append(mapped_field)
            queryset = queryset.order_by(*ordering)
        return queryset

