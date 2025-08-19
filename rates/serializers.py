from rest_framework import serializers
from .models import Rate, RateCategory, RateType


class RateSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    rate_type_display = serializers.CharField(source="get_rate_type_display", read_only=True)
    route = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Rate
        fields = [
            "id",
            "category",
            "category_display",
            "rate_type",
            "rate_type_display",
            "title",
            "description",
            "origin_country",
            "destination_country",
            "office_name",
            "amount",
            "route",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "category_display",
            "rate_type_display",
            "route",
        ]

    def get_route(self, obj):
        return f"{obj.origin_country} → {obj.destination_country}"

    def validate_amount(self, value):
        # Model already enforces non-negative; provide a clearer message
        if value is None:
            raise serializers.ValidationError("Amount is required.")
        if value < 0:
            raise serializers.ValidationError("Amount must be greater than or equal to 0.")
        return value

    def validate(self, data):
        """Cross-field and uniqueness validation mirroring model constraints."""
        # Use instance values for partial updates
        category = data.get("category", getattr(self.instance, "category", None))
        rate_type = data.get("rate_type", getattr(self.instance, "rate_type", None))
        origin_country = data.get("origin_country", getattr(self.instance, "origin_country", "")) or ""
        destination_country = data.get("destination_country", getattr(self.instance, "destination_country", "")) or ""
        office_name = data.get("office_name", getattr(self.instance, "office_name", "")) or ""
        title = data.get("title", getattr(self.instance, "title", "")) or ""
        amount = data.get("amount", getattr(self.instance, "amount", None))

        # Basic route validation (also enforced in model.clean)
        if origin_country.strip() and destination_country.strip():
            if origin_country.strip().lower() == destination_country.strip().lower():
                raise serializers.ValidationError(
                    {"destination_country": "Origin and destination countries must differ."}
                )

        # Uniqueness checks to surface friendly messages before hitting DB constraints
        qs = Rate.objects.all()
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)

        # Check title uniqueness on the route/type/office
        if all([category, rate_type, origin_country, destination_country, office_name, title]):
            exists_title = qs.filter(
                category=category,
                rate_type=rate_type,
                origin_country=origin_country,
                destination_country=destination_country,
                office_name=office_name,
                title=title,
            ).exists()
            if exists_title:
                raise serializers.ValidationError(
                    {"title": "A rate with this title already exists for the same route, type and office."}
                )

        # Check amount uniqueness on the route/type/office
        if all([category, rate_type, origin_country, destination_country, office_name]) and amount is not None:
            exists_amount = qs.filter(
                category=category,
                rate_type=rate_type,
                origin_country=origin_country,
                destination_country=destination_country,
                office_name=office_name,
                amount=amount,
            ).exists()
            if exists_amount:
                raise serializers.ValidationError(
                    {"amount": "A rate with this amount already exists for the same route, type and office."}
                )

        return data

    def _strip_string_fields(self, validated_data):
        """Trim simple string fields to avoid accidental whitespace duplicates."""
        for field in [
            "title",
            "description",
            "origin_country",
            "destination_country",
            "office_name",
        ]:
            if field in validated_data and isinstance(validated_data[field], str):
                validated_data[field] = validated_data[field].strip()
        return validated_data

    def create(self, validated_data):
        validated_data = self._strip_string_fields(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._strip_string_fields(validated_data)
        return super().update(instance, validated_data)
