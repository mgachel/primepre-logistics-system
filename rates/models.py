from django.db import models
from django.core.validators import MinValueValidator


class RateCategory(models.TextChoices):
    NORMAL = "NORMAL_GOODS", "Normal Goods"
    SPECIAL = "SPECIAL_GOODS", "Special Goods"
    SMALL = "SMALL_GOODS", "Small Goods"

class RateType(models.TextChoices):
    SEA = "SEA_RATES", "Sea Rates"
    AIR = "AIR_RATES", "Air Rates"

class Rate(models.Model):
    category = models.CharField(max_length=20, choices=RateCategory.choices)
    rate_type = models.CharField(max_length=15, choices=RateType.choices)

    title = models.CharField("Rate title", max_length=100)
    description = models.TextField(blank=True)
    
    origin_country = models.CharField(max_length=100)
    destination_country = models.CharField(max_length=100)

    office_name = models.CharField(max_length=100)

    amount = models.DecimalField(
        "Rate amount",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Rate"
        verbose_name_plural = "Rates"
        ordering = ["category", "rate_type", "origin_country", "destination_country", "title"]
        constraints = [
            # One title per route/type/category/office
            models.UniqueConstraint(
                fields=["category", "rate_type", "origin_country", "destination_country", "office_name", "title"],
                name="uniq_rate_by_route_office_title",
            ),
            
            # One amount per route/type/category/office (without deferrable for SQLite compatibility)
            models.UniqueConstraint(
                fields=["category", "rate_type", "origin_country", "destination_country", "office_name", "amount"],
                name="uniq_rate_by_route_office_amount",
            ),
        ]
        indexes = [
            models.Index(fields=["category", "rate_type"]),
            models.Index(fields=["origin_country", "destination_country"]),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.origin_country.strip().lower() == self.destination_country.strip().lower():
            raise ValidationError("Origin and destination countries must differ.")

    def __str__(self):
        return (
            f"{self.get_category_display()} | {self.get_rate_type_display()} "
            f"- {self.origin_country} → {self.destination_country} "
            f"({self.office_name}): {self.amount}"
        )
