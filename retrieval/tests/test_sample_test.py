import unittest

from fastapi.testclient import TestClient

from main import app


class SampleTestEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_post_sample_test_returns_success_response(self):
        response = self.client.post("/sample-test")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"response": "sample test successful"})

    def test_sample_test_rejects_non_post_requests(self):
        response = self.client.get("/sample-test")

        self.assertEqual(response.status_code, 405)


if __name__ == "__main__":
    unittest.main()
