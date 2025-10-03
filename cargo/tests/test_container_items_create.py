from datetime import date

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from cargo.models import CargoContainer, CargoItem
from users.models import CustomerUser


class ContainerItemsCreateViewTests(APITestCase):
    def setUp(self):
        self.admin_user = CustomerUser.objects.create_user(
            phone="0550000000",
            password="adminpass123",
            first_name="Admin",
            last_name="User",
            shipping_mark="PM ADMIN",
            region="GREATER_ACCRA",
            user_role="ADMIN",
            is_staff=True,
        )

        self.customer = CustomerUser.objects.create_user(
            phone="0550000001",
            password="customerpass123",
            first_name="John",
            last_name="Doe",
            shipping_mark="PM JD01",
            region="GREATER_ACCRA",
        )

        self.container = CargoContainer.objects.create(
            container_id="CONT123",
            cargo_type="sea",
            load_date=date.today(),
            eta=date.today(),
            route="Test Route",
        )

        CargoItem.objects.create(
            container=self.container,
            client=self.customer,
            tracking_id="TRACK123",
            item_description="Existing item",
            quantity=1,
        )

        self.client.force_authenticate(user=self.admin_user)

    def test_duplicate_tracking_number_does_not_break_transaction(self):
        url = reverse("cargo:container-items-create")
        payload = {
            "container_id": self.container.container_id,
            "matched_items": [
                {
                    "candidate": {
                        "source_row_number": 1,
                        "shipping_mark_normalized": "PMJD01",
                        "description": "Valid item",
                        "quantity": 2,
                        "cbm": 1.4,
                        "tracking_number": "TRACK000",
                    },
                    "customer": {
                        "id": self.customer.id,
                        "shipping_mark": self.customer.shipping_mark,
                        "name": self.customer.get_full_name(),
                    },
                }
            ],
            "resolved_mappings": [
                {
                    "unmatched_item_id": "row_2",
                    "action": "map_existing",
                    "customer_id": self.customer.id,
                    "candidate": {
                        "source_row_number": 2,
                        "shipping_mark_normalized": "PMJD01",
                        "description": "Duplicate item",
                        "quantity": 1,
                        "cbm": 0.8,
                        "tracking_number": "TRACK123",
                    },
                }
            ],
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data

        self.assertTrue(data["success"])
        self.assertEqual(data["statistics"]["total_created"], 1)
        self.assertGreaterEqual(len(data["errors"]), 1)

        error_messages = [error.get("error", "") for error in data["errors"]]
        self.assertTrue(
            any("Integrity error" in message for message in error_messages),
            msg=f"Expected integrity error message in {error_messages}",
        )

        self.assertTrue(
            CargoItem.objects.filter(
                container=self.container,
                tracking_id="TRACK000",
                client=self.customer,
            ).exists()
        )
