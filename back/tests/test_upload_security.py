import io
import tempfile
import unittest
import zipfile
from pathlib import Path

from app.upload_security import (
    UploadTooLarge,
    UploadValidationError,
    build_unique_storage_name,
    copy_with_size_limit,
    validate_file_content,
)


class UploadSecurityTests(unittest.TestCase):
    def test_copy_stops_when_upload_exceeds_limit(self):
        source = io.BytesIO(b"a" * 11)
        destination = io.BytesIO()

        with self.assertRaises(UploadTooLarge):
            copy_with_size_limit(source, destination, max_bytes=10, chunk_size=4)

        self.assertLessEqual(len(destination.getvalue()), 10)

    def test_rejects_file_whose_content_does_not_match_pdf_extension(self):
        with tempfile.NamedTemporaryFile(suffix=".pdf") as file_handle:
            file_handle.write(b"this is not a pdf")
            file_handle.flush()

            with self.assertRaises(UploadValidationError):
                validate_file_content(Path(file_handle.name), ".pdf")

    def test_accepts_docx_with_expected_office_structure(self):
        with tempfile.NamedTemporaryFile(suffix=".docx") as file_handle:
            with zipfile.ZipFile(file_handle.name, "w") as archive:
                archive.writestr("[Content_Types].xml", "<Types />")
                archive.writestr("word/document.xml", "<document />")

            validate_file_content(Path(file_handle.name), ".docx")

    def test_rejects_office_archive_with_excessive_expanded_size(self):
        with tempfile.NamedTemporaryFile(suffix=".docx") as file_handle:
            with zipfile.ZipFile(file_handle.name, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                archive.writestr("[Content_Types].xml", "<Types />")
                archive.writestr("word/document.xml", "a" * 101)

            with self.assertRaises(UploadValidationError):
                validate_file_content(
                    Path(file_handle.name),
                    ".docx",
                    max_expanded_bytes=100,
                )

    def test_storage_names_are_unique_and_confined_to_filename(self):
        first = build_unique_storage_name(7, "../../Biologia", ".pdf")
        second = build_unique_storage_name(7, "../../Biologia", ".pdf")

        self.assertNotEqual(first, second)
        self.assertNotIn("/", first)
        self.assertNotIn("..", first)
        self.assertTrue(first.endswith(".pdf"))


if __name__ == "__main__":
    unittest.main()
