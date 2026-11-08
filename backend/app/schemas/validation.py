def validate_password_strength(password: str) -> str:
    if len(password) < 12:
        raise ValueError("La contraseña debe tener al menos 12 caracteres.")
    if not any(character.isalpha() for character in password):
        raise ValueError("La contraseña debe incluir al menos una letra.")
    if not any(character.isdigit() for character in password):
        raise ValueError("La contraseña debe incluir al menos un número.")
    return password
