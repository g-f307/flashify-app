import re
import uuid
import zipfile
from pathlib import Path
from typing import BinaryIO


DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024
DEFAULT_MAX_EXPANDED_BYTES = 100 * 1024 * 1024
DEFAULT_MAX_ARCHIVE_MEMBERS = 2_000


class UploadValidationError(ValueError):
    pass


class UploadTooLarge(UploadValidationError):
    pass


def copy_with_size_limit(
    source: BinaryIO,
    destination: BinaryIO,
    *,
    max_bytes: int = DEFAULT_MAX_UPLOAD_BYTES,
    chunk_size: int = 64 * 1024,
) -> int:
    total = 0
    while chunk := source.read(chunk_size):
        remaining = max_bytes - total
        if len(chunk) > remaining:
            if remaining > 0:
                destination.write(chunk[:remaining])
            raise UploadTooLarge("O arquivo excede o limite de 10 MB.")
        destination.write(chunk)
        total += len(chunk)

    if total == 0:
        raise UploadValidationError("O arquivo enviado está vazio.")
    return total


def _validate_office_archive(
    path: Path,
    suffix: str,
    *,
    max_expanded_bytes: int,
    max_archive_members: int,
) -> None:
    if not zipfile.is_zipfile(path):
        raise UploadValidationError("O arquivo Office enviado não é um ZIP válido.")

    expected_prefix = "word/" if suffix == ".docx" else "ppt/"
    try:
        with zipfile.ZipFile(path) as archive:
            members = archive.infolist()
            if len(members) > max_archive_members:
                raise UploadValidationError("O arquivo Office contém itens demais.")

            expanded_size = 0
            has_content_types = False
            has_expected_content = False
            for member in members:
                member_path = Path(member.filename)
                if member_path.is_absolute() or ".." in member_path.parts:
                    raise UploadValidationError("O arquivo Office contém caminhos inválidos.")
                if member.flag_bits & 0x1:
                    raise UploadValidationError("Arquivos Office criptografados não são aceitos.")

                expanded_size += member.file_size
                if expanded_size > max_expanded_bytes:
                    raise UploadValidationError("O arquivo Office expandido excede o limite seguro.")

                has_content_types |= member.filename == "[Content_Types].xml"
                has_expected_content |= member.filename.startswith(expected_prefix)

            if not has_content_types or not has_expected_content:
                raise UploadValidationError("O conteúdo não corresponde à extensão informada.")
    except zipfile.BadZipFile as exc:
        raise UploadValidationError("O arquivo Office está corrompido.") from exc


def validate_file_content(
    path: Path,
    suffix: str,
    *,
    max_expanded_bytes: int = DEFAULT_MAX_EXPANDED_BYTES,
    max_archive_members: int = DEFAULT_MAX_ARCHIVE_MEMBERS,
) -> None:
    normalized_suffix = suffix.lower()
    with path.open("rb") as file_handle:
        header = file_handle.read(1024)

    if normalized_suffix == ".pdf":
        valid = b"%PDF-" in header
    elif normalized_suffix == ".png":
        valid = header.startswith(b"\x89PNG\r\n\x1a\n")
    elif normalized_suffix in {".jpg", ".jpeg"}:
        valid = header.startswith(b"\xff\xd8\xff")
    elif normalized_suffix in {".docx", ".pptx"}:
        _validate_office_archive(
            path,
            normalized_suffix,
            max_expanded_bytes=max_expanded_bytes,
            max_archive_members=max_archive_members,
        )
        return
    else:
        raise UploadValidationError("Extensão de arquivo não permitida.")

    if not valid:
        raise UploadValidationError("O conteúdo não corresponde à extensão informada.")


def build_unique_storage_name(user_id: int, title: str, suffix: str) -> str:
    safe_title = re.sub(r"[^a-z0-9_-]", "", title.lower().replace(" ", "_"))[:60]
    safe_title = safe_title.strip("._-") or "documento"
    return f"{user_id}_{uuid.uuid4().hex}_{safe_title}{suffix.lower()}"
