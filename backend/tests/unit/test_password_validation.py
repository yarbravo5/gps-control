import pytest

from app.schemas.validation import validate_password_strength


def test_password_strength_requires_twelve_characters() -> None:
    with pytest.raises(ValueError, match="12 caracteres"):
        validate_password_strength("Valid123!")


def test_password_strength_accepts_long_passphrase_with_letters_and_numbers() -> None:
    password = "Fleet control 2026"
    assert validate_password_strength(password) == password


@pytest.mark.parametrize("password", ["long password", "123456789012"])
def test_password_strength_requires_both_letters_and_numbers(password: str) -> None:
    with pytest.raises(ValueError):
        validate_password_strength(password)
