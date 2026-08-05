from django.test import TestCase


class CorsTests(TestCase):
    def preflight(self, origin, path="/api/books/"):
        return self.client.options(
            path,
            headers={
                "origin": origin,
                "access-control-request-method": "POST",
                "access-control-request-headers": "authorization,content-type",
            },
        )

    def test_preflight_allows_any_local_vite_port(self):
        for origin in (
            "http://localhost:5173",
            "http://localhost:4173",
            "http://127.0.0.1:5174",
        ):
            with self.subTest(origin=origin):
                response = self.preflight(origin)

                self.assertEqual(response.status_code, 200)
                self.assertEqual(response["access-control-allow-origin"], origin)
                self.assertIn(
                    "authorization",
                    response["access-control-allow-headers"],
                )
                self.assertEqual(
                    response["access-control-allow-credentials"],
                    "true",
                )

    def test_request_from_untrusted_origin_is_not_allowed(self):
        response = self.preflight("https://untrusted.example")

        self.assertNotIn("access-control-allow-origin", response)

    def test_media_preflight_includes_cors_header(self):
        origin = "http://localhost:5173"

        response = self.preflight(origin, "/media/books/default-cover.png")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["access-control-allow-origin"], origin)
