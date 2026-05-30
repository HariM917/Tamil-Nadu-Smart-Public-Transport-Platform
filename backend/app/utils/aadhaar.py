"""Aadhaar masking utilities — store and expose only masked format (XXXX XXXX 1234)."""
import re
from typing import Optional


def extract_digits(value: Optional[str]) -> str:
    """Return digits-only Aadhaar string."""
    if not value:
        return ""
    return re.sub(r"\D", "", value)


def mask_aadhaar(value: Optional[str]) -> Optional[str]:
    """
    Mask a 12-digit Aadhaar as XXXX XXXX 1234.
    If already masked, normalize format.
    """
    if not value:
        return None
    digits = extract_digits(value)
    if len(digits) == 12:
        return f"XXXX XXXX {digits[-4:]}"
    # Already masked or partial
    if "XXXX" in value.upper():
        last4_match = re.search(r"(\d{4})\s*$", value.strip())
        if last4_match:
            return f"XXXX XXXX {last4_match.group(1)}"
    return value


def last4(value: Optional[str]) -> str:
    """Last four digits for cross-validation (never store full number in API)."""
    digits = extract_digits(value)
    if len(digits) >= 4:
        return digits[-4:]
    masked = mask_aadhaar(value)
    if masked:
        return masked.split()[-1]
    return ""
