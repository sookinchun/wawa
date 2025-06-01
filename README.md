# Python Full-Stack Task Scheduler

## Overview

This project is a full-stack task scheduling system built with Python and Flask for the backend, and HTML, CSS, and JavaScript (with FullCalendar) for the frontend. It allows users to manage tasks, schedule them for specific dates and times, and view them in a list or calendar format.

**Features:**
*   **Task Management:** Add, edit, and remove tasks.
*   **Scheduling:** Assign tasks to specific dates and times.
*   **Task Details:** Specify target system and task action from predefined dropdowns.
*   **Task Viewing:** List tasks with filtering (day, week, month, year).
*   **Calendar View:** View tasks on a monthly calendar, also with filtering.
*   **Logging:** All actions (UI or API-triggered) are logged to a text file.
*   **Secure Storage:** Task information is stored in an encrypted text file using AES encryption.

## Project Structure

/backend/           # Flask backend application
    app.py          # Main Flask application file, API endpoints
    config.py       # Configuration (available systems, actions, encryption key)
    encryption.py   # Encryption/decryption logic
    logger.py       # Logging setup
    models.py       # Task data model
    requirements.txt# Backend Python dependencies
    __init__.py     # Makes 'backend' a package
/data/              # Stores encrypted task data
    tasks.encrypted.txt # Encrypted task data file (created automatically)
/frontend/          # Frontend HTML, CSS, JS
    index.html      # Main HTML page
    /css/
        style.css   # Stylesheet
    /js/
        app.js      # Frontend JavaScript logic
/logs/              # Stores action logs
    actions.log     # Action log file (created automatically)
README.md           # This file

## Setup Instructions

### Prerequisites
*   Python 3.7+
*   `pip` (Python package installer)

### Installation
1.  **Clone the repository (if applicable):**
    ```bash
    # git clone <repository-url>
    # cd <repository-directory>
    ```

2.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv
    ```
    *   Activate the virtual environment:
        *   On Windows: `venv\Scripts\activate`
        *   On macOS/Linux: `source venv/bin/activate`

3.  **Install backend dependencies:**
    ```bash
    pip install -r backend/requirements.txt
    ```

## Environment Configuration for Flask

This application uses Flask and can be configured using environment variables. These are particularly useful when using the `flask run` command. When running `python backend/app.py` directly, the script now includes defaults (Debug ON, Port 8080, Host 0.0.0.0) but will still be overridden by these environment variables if set.

Key environment variables:

*   **`FLASK_APP`**: Tells Flask where your application is.
    *   Recommended value: `backend.app:app` (if your main Flask app instance is named `app` in `backend/app.py`) or simply `backend.app` if Flask can auto-detect the `app` instance. For clarity, `backend.app:app` is more explicit.
*   **`FLASK_DEBUG`**: Enables or disables debug mode.
    *   Set to `1` (or `True`) to enable debug mode (provides debugger, auto-reloader).
    *   Set to `0` (or `False`) to disable debug mode (for production-like behavior).
    *   Defaults to ON if running `python backend/app.py` and variable is not set.
*   **`FLASK_RUN_PORT`**: Specifies the port the development server runs on.
    *   Example: `8080` or `5001`.
    *   Defaults to `8080` if running `python backend/app.py` and variable is not set. `flask run` defaults to `5000`.
*   **`FLASK_RUN_HOST`**: Specifies the host the development server binds to.
    *   Set to `0.0.0.0` to make the server accessible on your local network.
    *   Set to `127.0.0.1` to only allow connections from your own computer.
    *   Defaults to `0.0.0.0` if running `python backend/app.py` and variable is not set. `flask run` defaults to `127.0.0.1`.

### Setting Environment Variables

**1. Temporarily (for the current terminal session):**

*   **Windows (Command Prompt):**
    ```cmd
    set FLASK_APP=backend.app:app
    set FLASK_DEBUG=1
    set FLASK_RUN_PORT=8080
    set FLASK_RUN_HOST=0.0.0.0
    ```
*   **Windows (PowerShell):**
    ```powershell
    $env:FLASK_APP="backend.app:app"
    $env:FLASK_DEBUG="1"
    $env:FLASK_RUN_PORT="8080"
    $env:FLASK_RUN_HOST="0.0.0.0"
    ```
*   **macOS / Linux (bash/zsh):**
    ```bash
    export FLASK_APP=backend.app:app
    export FLASK_DEBUG=1
    export FLASK_RUN_PORT=8080
    export FLASK_RUN_HOST=0.0.0.0
    ```

**2. Persistently (across terminal sessions and reboots):**

*   **Windows:**
    1.  Search for "environment variables" in the Start Menu.
    2.  Click "Edit the system environment variables."
    3.  In the System Properties dialog, click the "Environment Variables..." button.
    4.  In the "User variables" section (for your user only) or "System variables" section (for all users), click "New..." to add `FLASK_APP`, `FLASK_DEBUG`, `FLASK_RUN_PORT`, `FLASK_RUN_HOST` and their desired values.
    5.  Click OK on all dialogs. You may need to restart your terminal or PC for changes to take full effect.

*   **macOS / Linux:**
    1.  Add the `export` commands (from the temporary section above) to your shell's profile script. This is usually one of:
        *   `~/.bashrc` (for bash shell, common on Linux)
        *   `~/.zshrc` (for zsh shell, common on newer macOS)
        *   `~/.bash_profile` or `~/.profile` (loaded for login shells)
    2.  For example, add to the end of `~/.bashrc`:
        ```bash
        export FLASK_APP=backend.app:app
        export FLASK_DEBUG=1
        export FLASK_RUN_PORT=8080
        export FLASK_RUN_HOST=0.0.0.0
        ```
    3.  Save the file. For the changes to take effect, either run `source ~/.bashrc` (or your specific profile file) or open a new terminal window.

**3. Using a Helper Script (Recommended for Project-Specific Settings):**

You can create a small script in the root of your project to set these variables and run the Flask app. This keeps the settings with the project and doesn't modify your global environment.

*   **`run.bat` (for Windows):**
    Create a file named `run.bat` in your project root with the following content:
    ```batch
    @echo off
    echo Setting environment variables for Flask...
    set FLASK_APP=backend.app:app
    set FLASK_DEBUG=1
    set FLASK_RUN_PORT=8080
    set FLASK_RUN_HOST=0.0.0.0

    echo Starting Flask server via 'flask run'...
    flask run

    REM Alternatively, to run directly with Python:
    REM echo Starting Flask server via 'python backend/app.py'...
    REM python backend/app.py
    ```
    To run, simply execute `run.bat` from your project directory in Command Prompt.

*   **`run.sh` (for macOS / Linux):**
    Create a file named `run.sh` in your project root:
    ```bash
    #!/bin/bash
    echo "Setting environment variables for Flask..."
    export FLASK_APP=backend.app:app
    export FLASK_DEBUG=1
    export FLASK_RUN_PORT=8080
    export FLASK_RUN_HOST=0.0.0.0

    echo "Starting Flask server via 'flask run'..."
    flask run

    # Alternatively, to run directly with Python:
    # echo "Starting Flask server via 'python backend/app.py'..."
    # python backend/app.py
    ```
    Make it executable: `chmod +x run.sh`
    To run: `./run.sh` from your project directory.

### Encryption Key Management
**IMPORTANT:** The current implementation stores the AES encryption key directly in `backend/config.py` (`ENCRYPTION_KEY`). This is **NOT secure for production environments.**

*   **For Development/This Exercise:** The key `Z1Q2sRg4A6k0J7pG8vX3wY_L9hN0cK2mR5sU6wI1dF4=` is hardcoded. If you were to change this key after data has been encrypted, existing data would become undecipherable.
*   **For Production:** The `ENCRYPTION_KEY` should be managed securely, for example:
    *   As an environment variable that the application reads.
    *   Using a secrets management service (e.g., HashiCorp Vault, AWS Secrets Manager, Google Cloud Secret Manager).
    *   Do NOT commit the actual production key to version control if it were to be hardcoded temporarily in a config file.

## Running the Application

1.  Ensure your virtual environment is activated.
2.  Set up the necessary environment variables as described in "Environment Configuration for Flask" (e.g., `FLASK_APP`). Alternatively, use one of the helper scripts (`run.bat` or `run.sh`) which set these for you.
3.  Navigate to the **root directory** of the project.
4.  To run the server:
    *   **Using `flask run` (recommended if `FLASK_APP` is set):**
        ```bash
        flask run
        ```
        This will use the host/port/debug settings from environment variables `FLASK_RUN_HOST`, `FLASK_RUN_PORT`, and `FLASK_DEBUG`.
    *   **Running `app.py` directly:**
        ```bash
        python backend/app.py
        ```
        This method will use defaults (Host: 0.0.0.0, Port: 8080, Debug: ON) if environment variables are not set, but will be overridden by `FLASK_RUN_HOST`, `FLASK_RUN_PORT`, and `FLASK_DEBUG` if they are set.
    *   **Using helper scripts:**
        *   Windows: `run.bat`
        *   macOS/Linux: `./run.sh`
5.  Open your web browser and go to the address shown in the terminal (e.g., `http://127.0.0.1:5000`, `http://0.0.0.0:8080`, or your configured host/port).

## API Documentation

The backend provides the following RESTful API endpoints:

### Configuration
*   **GET `/api/config/options`**
    *   **Description:** Retrieves available options for task systems and actions, used to populate dropdowns in the UI.
    *   **Request:** None
    *   **Response:** `200 OK`
        ```json
        {
          "systems": [
            "Server Alpha",
            "Desktop Omega",
            // ... other systems
          ],
          "actions": [
            "User Management - Add User",
            "Software Installation - Deploy App X",
            // ... other actions
          ]
        }
        ```

### Tasks
*   **POST `/api/tasks`**
    *   **Description:** Creates a new task.
    *   **Request Body (JSON):**
        ```json
        {
          "name": "Deploy new web server", // Task Title/Summary (Required, non-empty)
          "description": "Software Installation - Deploy App X - Setup Apache on Server Alpha", // Task Action (from dropdown) - Additional Details (Required)
          "date": "YYYY-MM-DD", // (Required, valid date)
          "time": "HH:MM",      // (Required, valid time)
          "target_system": "Server Alpha" // (Required, must be in AVAILABLE_SYSTEMS)
        }
        ```
    *   **Response:**
        *   `201 Created`: Task created successfully. Returns the created task object.
            ```json
            {
              "id": "generated_uuid_hex",
              "name": "Deploy new web server",
              "description": "Software Installation - Deploy App X - Setup Apache on Server Alpha",
              "date": "YYYY-MM-DD",
              "time": "HH:MM",
              "target_system": "Server Alpha",
              "status": "pending"
            }
            ```
        *   `400 Bad Request`: Invalid input (e.g., missing fields, invalid date format, invalid system/action). Returns error details.
            ```json
            { "error": "Missing required fields" }
            // or
            { "error": "Invalid date format. Please use YYYY-MM-DD." }
            // or
            { "error": "Task name is required and cannot be empty" }
            // or
            { "error": "Invalid target system: SystemName" }
            // or
            { "error": "Invalid task action in description: ActionName" }
            ```
        *   `500 Internal Server Error`: If an unexpected error occurs.

*   **GET `/api/tasks`**
    *   **Description:** Retrieves a list of tasks, with optional filtering.
    *   **Query Parameters (Optional):**
        *   `date` (string): Filter by specific date (e.g., `YYYY-MM-DD`).
        *   `week` (string): Filter by ISO week number (e.g., `YYYY-Www`, like `2023-W45`).
        *   `month` (string): Filter by month (e.g., `YYYY-MM`, like `2023-11`).
        *   `year` (string): Filter by year (e.g., `YYYY`, like `2023`).
    *   **Response:** `200 OK`
        *   Returns a JSON array of task objects.
            ```json
            [
              {
                "id": "uuid1",
                "name": "Task 1",
                "description": "Action - Details",
                "date": "YYYY-MM-DD",
                "time": "HH:MM",
                "target_system": "System A",
                "status": "pending"
              },
              // ... other tasks
            ]
            ```
        *   `500 Internal Server Error`: If an unexpected error occurs during filtering.


*   **GET `/api/tasks/<task_id>`**
    *   **Description:** Retrieves a specific task by its ID.
    *   **URL Parameters:**
        *   `task_id` (string): The unique ID of the task.
    *   **Response:**
        *   `200 OK`: Returns the task object.
        *   `404 Not Found`: If the task with the given ID doesn't exist.
        *   `500 Internal Server Error`: If an unexpected error occurs.

*   **PUT `/api/tasks/<task_id>`**
    *   **Description:** Updates an existing task. Include only the fields you want to update in the request body.
    *   **URL Parameters:**
        *   `task_id` (string): The ID of the task to update.
    *   **Request Body (JSON):** (Example: updating name and date)
        ```json
        {
          "name": "Updated Task Name",
          "date": "YYYY-MM-DD"
          // ... any other fields to update (description, time, target_system, status)
        }
        ```
    *   **Response:**
        *   `200 OK`: Task updated successfully. Returns the updated task object.
        *   `400 Bad Request`: Invalid input (e.g., empty name if provided, invalid date format, invalid system/action if provided).
        *   `404 Not Found`: If the task with the given ID doesn't exist.
        *   `500 Internal Server Error`: If an unexpected error occurs.

*   **DELETE `/api/tasks/<task_id>`**
    *   **Description:** Deletes a specific task by its ID.
    *   **URL Parameters:**
        *   `task_id` (string): The ID of the task to delete.
    *   **Response:**
        *   `200 OK`: Task deleted successfully. (Often `204 No Content` is used, but current implementation returns a JSON message)
            ```json
            { "message": "Task deleted successfully" }
            ```
        *   `404 Not Found`: If the task with the given ID doesn't exist.
        *   `500 Internal Server Error`: If an unexpected error occurs.

## Logging
All actions performed through the UI or API are logged into `logs/actions.log`. This includes:
*   Task creation, updates, deletions.
*   Attempts to retrieve tasks (including filter criteria).
*   Server-side operations like loading/saving tasks from/to the data file.
*   Errors encountered during operations.
Each log entry includes a timestamp, logger name, log level, the IP address of the requester (if applicable), and a descriptive message.

## Data Storage and Encryption
Task data is stored in `data/tasks.encrypted.txt`. Each task is stored as a JSON object on a new line, and each line is individually encrypted using AES (via the Fernet library).
The encryption ensures that the raw task data is not human-readable in the file. Decryption occurs when tasks are loaded into memory by the application.

---
*This README provides a guide to setting up, running, and understanding the Task Scheduler application.*
