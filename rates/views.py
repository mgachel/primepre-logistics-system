from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Min, Max, Avg

from .models import Rate
from .serializers import RateSerializer


class RateViewSet(viewsets.ModelViewSet):
    queryset = Rate.objects.all()
    serializer_class = RateSerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        "category",
        "rate_type",
        "origin_country",
        "destination_country",
        "office_name",
    ]
    search_fields = [
        "title",
        "description",
        "origin_country",
        "destination_country",
        "office_name",
    ]
    ordering_fields = ["amount", "created_at", "updated_at", "title"]
    ordering = [
        "category",
        "rate_type",
        "origin_country",
        "destination_country",
        "title",
    ]

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = self.filter_queryset(self.get_queryset())
        data = {
            "total": qs.count(),
            "by_category": list(qs.values("category").annotate(count=Count("id")).order_by("category")),
            "by_type": list(qs.values("rate_type").annotate(count=Count("id")).order_by("rate_type")),
            "amount": qs.aggregate(min=Min("amount"), max=Max("amount"), avg=Avg("amount")),
        }
        return Response(data)

    @action(detail=False, methods=["get"])
    def routes(self, request):
        qs = self.filter_queryset(self.get_queryset())
        routes = qs.values("origin_country", "destination_country").annotate(count=Count("id")).order_by(
            "origin_country", "destination_country"
        )
        return Response(list(routes))

    @action(detail=False, methods=["get"])
    def offices(self, request):
        qs = self.filter_queryset(self.get_queryset())
        offices = qs.values("office_name").annotate(count=Count("id")).order_by("office_name")
        return Response(list(offices))

# Create your views here.
