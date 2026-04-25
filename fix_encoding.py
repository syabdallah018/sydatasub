#!/usr/bin/env python3
"""
Fix mojibake/broken UTF-8 sequences in app/app/page.tsx.

The file is UTF-8, but some UI strings were edited while decoded as latin-1,
producing visible "Ãƒ..." garbage in the UI (naira sign, separators, emojis).
"""

from __future__ import annotations

import re

FILE_PATH = "app/app/page.tsx"


def main() -> int:
    with open(FILE_PATH, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    original = content

    # Core symbols (what users actually see)
    content = content.replace("ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¦", "₦")  # Naira
    content = content.replace("Ãƒâ€šÃ‚Â·", " - ")  # middle dot separator
    content = content.replace("â‚¦", "₦")  # another mojibake Naira

    # Common broken placeholders (dashes)
    content = content.replace("ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â", "-")
    content = content.replace("ÃƒÂ¢Ã¢â‚¬Â", "-")
    content = content.replace("â€“", "-")

    # Toast/punctuation fragments we don't want to show as mojibake.
    content = content.replace("ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“", "-")
    content = content.replace("ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“", "")
    content = content.replace("ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦", "...")
    content = content.replace("ÃƒÂ¢Ã¢â‚¬Â¦", "...")
    content = content.replace("Ã¢â€šÂ¦", "...")
    content = content.replace("âœ“", "")

    # Remove mojibake emoji prefixes that show up in headers/cards.
    content = re.sub(r"ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“[^\s]+\s*", "", content)
    content = re.sub(r"ÃƒÂ°[^\n]*", "", content)

    # Fix the greeting line if it still has mojibake after other replacements.
    content = re.sub(r"Welcome back\s+.*", "Welcome back", content)

    # PIN placeholders were corrupted; use ASCII to avoid future encoding issues.
    content = re.sub(
        r'placeholder="(?:ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢){6}"',
        'placeholder="******"',
        content,
    )
    content = content.replace("ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢", "*")

    # Fix account name fallback to not show mojibake.
    content = re.sub(
        r'\{account\.accountName \|\| "[^"]*"\}',
        '{account.accountName || "Not available"}',
        content,
    )

    # Replace txEmoji mojibake literals with short ASCII tags.
    content = content.replace(
        'let txEmoji = "ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â±";', 'let txEmoji = "TX";'
    )
    content = content.replace('txEmoji = "ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â ";', 'txEmoji = "IN";')
    content = content.replace(
        'txEmoji = "ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â¾";', 'txEmoji = "DATA";'
    )
    content = content.replace(
        'txEmoji = "ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Âº";', 'txEmoji = "AIR";'
    )
    content = content.replace('txEmoji = "ÃƒÂ¢Ã…Â¡Ã‚Â¡";', 'txEmoji = "OUT";')

    # Power provider list had mojibake icons; remove them.
    content = content.replace('logo: "ÃƒÂ¢Ã…Â¡Ã‚Â¡"', 'logo: ""')
    content = content.replace("ÃƒÂ¢Ã…Â¡Ã‚Â ", "")
    content = content.replace("ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢", "")

    # Comment banners: keep them readable and ASCII.
    content = re.sub(r"// Ãƒ.*", "// ---", content)
    content = re.sub(r"\{/\* Ãƒ.*?\*/\}", "{/* --- */}", content)
    content = re.sub(r"// -Ã¢.*", "// ---", content)
    content = re.sub(r"\{/\* -Ã¢.*?\*/\}", "{/* --- */}", content)

    if content == original:
        print(f"OK: no mojibake found in {FILE_PATH}")
        return 0

    with open(FILE_PATH, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Fixed mojibake in {FILE_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
