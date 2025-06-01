from cryptography.fernet import Fernet
from backend.config import ENCRYPTION_KEY
from backend.logger import action_logger # For logging decryption errors

try:
    key_bytes = ENCRYPTION_KEY.encode('utf-8') # Ensure key is bytes
    cipher_suite = Fernet(key_bytes)
except Exception as e:
    action_logger.error(f"Failed to initialize Fernet cipher: {e}. Ensure ENCRYPTION_KEY is a valid Fernet key.")
    # Fallback to a dummy cipher to prevent app crash, though this is not ideal for security.
    # In a real scenario, the app should probably not start or handle this more gracefully.
    cipher_suite = None # Or raise an error to stop the app

def encrypt_data(data: str) -> str:
    if not cipher_suite:
        action_logger.error("Encryption attempted but cipher suite is not initialized.")
        # Consider if a custom exception or specific return value is more appropriate
        raise ValueError("Encryption service not available due to key initialization failure.")
    try:
        data_bytes = data.encode('utf-8')
        encrypted_bytes = cipher_suite.encrypt(data_bytes)
        return encrypted_bytes.decode('utf-8')
    except Exception as e:
        action_logger.error(f"Error during encryption: {e}")
        raise # Re-raise the exception to make the caller aware

def decrypt_data(data: str) -> str:
    if not cipher_suite:
        action_logger.error("Decryption attempted but cipher suite is not initialized.")
        # Consider if a custom exception or specific return value is more appropriate
        raise ValueError("Decryption service not available due to key initialization failure.")
    try:
        data_bytes = data.encode('utf-8') # Encrypted data is already base64 encoded string from encryption output
        decrypted_bytes = cipher_suite.decrypt(data_bytes)
        return decrypted_bytes.decode('utf-8')
    except Fernet.InvalidToken:
        action_logger.error(f"Invalid token during decryption. Data may be corrupted or key mismatch.")
        raise # Re-raise specific Fernet exception
    except Exception as e:
        action_logger.error(f"Error during decryption: {e}")
        # Re-raise the exception or return a value indicating failure
        # For this exercise, re-raising helps in debugging and identifying issues.
        raise
