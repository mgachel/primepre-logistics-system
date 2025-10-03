from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """Default pagination with optional page size override."""
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 5000
