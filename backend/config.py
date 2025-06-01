AVAILABLE_SYSTEMS = [
    "Server Alpha",
    "Desktop Omega",
    "Cloud Instance Gamma",
    "Network Switch Zeta",
    "IoT Device Cluster",
    "Mainframe",
    "Point of Sale System"
]

AVAILABLE_TASK_ACTIONS = [
    "User Management - Add User",
    "User Management - Remove User",
    "User Management - Reset Password",
    "Software Installation - Deploy App X",
    "Software Installation - Uninstall App Y",
    "System Update - Apply Patches",
    "System Update - OS Upgrade",
    "Performance Monitoring - Check CPU/Memory",
    "Performance Monitoring - Analyze Logs",
    "Data Backup - Full System Backup",
    "Data Backup - Incremental Database Backup",
    "Security Scan - Vulnerability Assessment",
    "Network Configuration - Update Firewall Rules"
]

from cryptography.fernet import Fernet

# IMPORTANT: For production, manage this key securely (e.g., environment variable)
# and do not commit it to version control if it's hardcoded directly.
# For this exercise, we generate it if not present or use a fixed one for simplicity if needed.
# A better approach for exercise might be to try to get from env var, then default.
# However, to ensure it works across runs without user intervention for this exercise,
# we'll define it here directly.
# To generate a key once:
# from cryptography.fernet import Fernet
# key = Fernet.generate_key()
# print(key.decode())
# Then paste that value here.
ENCRYPTION_KEY = "Z1Q2sRg4A6k0J7pG8vX3wY_L9hN0cK2mR5sU6wI1dF4="
