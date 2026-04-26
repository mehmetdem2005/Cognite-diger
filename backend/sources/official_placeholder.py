from __future__ import annotations

from typing import Any


class OfficialPartnerAdapter:
    """Resmî API veya anlaşmalı veri feed'i için adaptör iskeleti.

    Sahibinden/arabam/hepsiemlak gibi kaynaklarda bu sınıf ancak resmî izin,
    sözleşme veya belgeyle kullanılmalıdır. HTML kazıma, CAPTCHA aşma ve CORS
    dolanma bu projede desteklenmez.
    """

    name = "official_partner"
    legal_mode = "official_api_or_partner_feed_only"

    async def search(self, filters: dict[str, Any]) -> list[dict[str, Any]]:
        return []
