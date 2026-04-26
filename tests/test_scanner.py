from backend.scanner import normalize_text, scan_text


def test_normalize_text_handles_turkish_characters() -> None:
    assert normalize_text("İMAR DEĞİŞİKLİĞİ") == normalize_text("imar degisikligi")
    assert normalize_text("IĞDIR") == normalize_text("igdir")


def test_scan_text_counts_hits_and_contexts() -> None:
    text = "Seyhan Belediyesi imar planı değişikliği yaptı. Ada 123 parsel 45 görüşüldü."
    result = scan_text(text, ["imar", "parsel", "bulunmayan"])

    assert result["total_hits"] == 2
    assert result["matched_keywords"] == 2
    assert result["keywords"][0]["found"] is True
    assert result["keywords"][1]["contexts"]
    assert result["keywords"][2]["found"] is False
