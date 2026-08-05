from django.test import TestCase


class CorsTests(TestCase):
    def test_preflight_from_frontend_origin_is_allowed(self):
        response = self.client.options(
            "/api/books/",
            headers={
                "origin": "http://localhost:5173",
                "access-control-request-method": "GET",
                "access-control-request-headers": "authorization,content-type",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response["access-control-allow-origin"],
            "http://localhost:5173",
        )
        self.assertIn(
            "authorization",
            response["access-control-allow-headers"],
        )
