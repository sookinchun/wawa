def encrypt_data(data: str) -> str:
    """
    Placeholder for encryption.
    For now, it just prefixes the data with "encrypted_".
    """
    return f"encrypted_{data}"

def decrypt_data(data: str) -> str:
    """
    Placeholder for decryption.
    For now, it just removes "encrypted_" if present.
    """
    if data.startswith("encrypted_"):
        return data[len("encrypted_"):]
    return data
