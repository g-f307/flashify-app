import unittest
from pathlib import Path


class ContainerSecurityTests(unittest.TestCase):
    def test_backend_image_does_not_copy_google_credentials(self):
        dockerfile = (Path(__file__).parents[2] / "back" / "Dockerfile").read_text()

        self.assertNotIn("COPY ./gcp-credentials.json", dockerfile)

    def test_example_environment_does_not_contain_google_api_key(self):
        example_env = (Path(__file__).parents[2] / "back" / ".env.example").read_text()

        self.assertNotIn("AIza", example_env)

    def test_google_credentials_are_excluded_from_docker_build_context(self):
        dockerignore = (Path(__file__).parents[2] / "back" / ".dockerignore").read_text()

        self.assertIn("gcp-credentials.json", dockerignore)


if __name__ == "__main__":
    unittest.main()
