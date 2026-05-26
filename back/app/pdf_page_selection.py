from __future__ import annotations

import re


class PageSelectionError(ValueError):
    """Erro de validacao para filtros de paginas de PDF."""


_PAGE_TOKEN_RE = re.compile(r"^\d+(?:-\d+)?$")


def parse_page_selection(selection: str | None, total_pages: int) -> list[int] | None:
    """
    Converte uma selecao como ``1,2,5-8`` em uma lista ordenada de paginas 1-indexadas.

    Retorna ``None`` quando nenhuma selecao for informada, indicando "todas as paginas".
    """
    if total_pages <= 0:
        raise PageSelectionError("O PDF informado nao possui paginas disponiveis.")

    if selection is None:
        return None

    normalized = selection.strip()
    if not normalized:
        return None

    pages: set[int] = set()

    for raw_token in normalized.split(","):
        token = raw_token.strip()
        if not token:
            raise PageSelectionError(
                "Filtro de paginas invalido. Use formatos como 1,2,3 ou 1-5."
            )

        if not _PAGE_TOKEN_RE.match(token):
            raise PageSelectionError(
                f"Trecho invalido '{token}'. Use apenas numeros e intervalos como 1-5."
            )

        if "-" in token:
            start_str, end_str = token.split("-", 1)
            start = int(start_str)
            end = int(end_str)
            if start > end:
                raise PageSelectionError(
                    f"Intervalo invalido '{token}'. O inicio deve ser menor ou igual ao fim."
                )
            for page in range(start, end + 1):
                _validate_page_number(page, total_pages)
                pages.add(page)
            continue

        page = int(token)
        _validate_page_number(page, total_pages)
        pages.add(page)

    if not pages:
        raise PageSelectionError("Nenhuma pagina valida foi informada.")

    return sorted(pages)


def _validate_page_number(page: int, total_pages: int) -> None:
    if page < 1:
        raise PageSelectionError("Os numeros de pagina devem comecar em 1.")
    if page > total_pages:
        raise PageSelectionError(
            f"A pagina {page} excede o total de {total_pages} paginas do PDF."
        )
