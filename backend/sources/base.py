from __future__ import annotations

from typing import Protocol, Any


class SourceAdapter(Protocol):
    name: str
    legal_mode: str

    async def search(self, filters: dict[str, Any]) -> list[dict[str, Any]]:
        """İzinli kaynaktan ilanları getirir."""
        ...
