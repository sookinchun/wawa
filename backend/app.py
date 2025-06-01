import json
import os
import uuid
from datetime import datetime # Added
from dateutil.parser import isoparse # Added

from flask import Flask, request, jsonify, render_template
from cryptography.fernet import InvalidToken
from backend.models import Task
from backend.encryption import encrypt_data, decrypt_data
from backend.logger import action_logger
from backend.config import AVAILABLE_SYSTEMS, AVAILABLE_TASK_ACTIONS # Added

app = Flask(__name__, template_folder=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend'), static_url_path='/static', static_folder=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend'))

tasks_db = []
DATA_FILE = "data/tasks.encrypted.txt"

def load_tasks_from_file():
    global tasks_db
    action_logger.info(f"Attempting to load tasks from {DATA_FILE}")
    if not os.path.exists(DATA_FILE):
        data_dir = os.path.dirname(DATA_FILE)
        if not os.path.exists(data_dir):
            try:
                os.makedirs(data_dir)
                action_logger.info(f"Created data directory: {data_dir}")
            except OSError as e:
                action_logger.error(f"Error creating directory {data_dir}: {e}")
                print(f"Error creating directory {data_dir}: {e}")
                return
        try:
            with open(DATA_FILE, 'w') as f:
                pass
            action_logger.info(f"Created empty data file: {DATA_FILE}")
        except IOError as e:
            action_logger.error(f"Error creating file {DATA_FILE}: {e}")
            print(f"Error creating file {DATA_FILE}: {e}")
            return

    tasks_db = []
    try:
        with open(DATA_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    decrypted_line = decrypt_data(line)
                    task_data = json.loads(decrypted_line) # Ensure this is also within the try for the new structure
                    tasks_db.append(Task.from_dict(task_data))
                except InvalidToken: # Specific exception from Fernet for bad token
                    action_logger.error(f"Failed to decrypt line (invalid token/key mismatch, logged from app.py): {line}. Skipping task. - IP: {request.remote_addr if request else 'N/A'}")
                except json.JSONDecodeError as e:
                    # It's good practice to log the decrypted_line if available and safe to do so,
                    # but if decryption fails, decrypted_line might not be what you expect.
                    # The original 'line' (encrypted) is logged by InvalidToken case.
                    action_logger.error(f"Error decoding JSON from successfully decrypted line. Content (if available and safe): '{decrypted_line if 'decrypted_line' in locals() else 'N/A'}'. Error: {e} - IP: {request.remote_addr if request else 'N/A'}")
                except Exception as e: # Generic catch for other decryption or Task.from_dict issues
                    action_logger.error(f"Error processing line (post-decryption or other critical error): {line}. Error: {e} - IP: {request.remote_addr if request else 'N/A'}")
        action_logger.info(f"Tasks loaded successfully from {DATA_FILE}")
    except FileNotFoundError:
        action_logger.warning(f"Data file {DATA_FILE} not found. Starting with an empty task list. - IP: {request.remote_addr if request else 'N/A'}")
        tasks_db = []
    except IOError as e:
        action_logger.error(f"Error reading from file {DATA_FILE}: {e} - IP: {request.remote_addr if request else 'N/A'}")
        tasks_db = []


def save_tasks_to_file():
    action_logger.info(f"Attempting to save tasks to {DATA_FILE}")
    data_dir = os.path.dirname(DATA_FILE)
    if not os.path.exists(data_dir):
        try:
            os.makedirs(data_dir)
            action_logger.info(f"Created data directory {data_dir} for saving.")
        except OSError as e:
            action_logger.error(f"Error creating directory {data_dir} for saving: {e} - IP: {request.remote_addr if request else 'N/A'}")
            return

    try:
        with open(DATA_FILE, 'w') as f:
            for task in tasks_db:
                task_dict = task.to_dict()
                json_str = json.dumps(task_dict)
                encrypted_str = encrypt_data(json_str)
                f.write(encrypted_str + "\n")
        action_logger.info(f"Tasks saved successfully to {DATA_FILE}")
    except IOError as e:
        action_logger.error(f"Error writing to file {DATA_FILE}: {e} - IP: {request.remote_addr if request else 'N/A'}")
    except Exception as e:
        action_logger.error(f"An unexpected error occurred during save_tasks_to_file: {e} - IP: {request.remote_addr if request else 'N/A'}")

with app.app_context():
    load_tasks_from_file()

@app.route('/')
def home():
    return render_template("index.html")

@app.route('/api/tasks', methods=['POST'])
def create_task():
    remote_addr = request.remote_addr
    try:
        data = request.json
        if not data:
            action_logger.error(f"Failed to create task: Invalid input (empty data) - IP: {remote_addr}")
            return jsonify({"error": "Invalid input"}), 400

        required_fields = ["name", "description", "date", "time", "target_system"]
        if not all(field in data for field in required_fields):
            action_logger.error(f"Failed to create task: Missing required fields. Data: {data} - IP: {remote_addr}")
            return jsonify({"error": "Missing required fields"}), 400

        # Validate name
        if not data.get("name") or not data["name"].strip():
            action_logger.error(f"Failed to create task: Name is required and cannot be empty. Data: {data} - IP: {remote_addr}")
            return jsonify({"error": "Task name is required and cannot be empty"}), 400

        # Validate date format
        try:
            isoparse(data["date"])
        except ValueError:
            action_logger.error(f"Failed to create task: Invalid date format for {data['date']}. Data: {data} - IP: {remote_addr}")
            return jsonify({"error": "Invalid date format. Please use YYYY-MM-DD."}), 400

        # Validate target system
        if data["target_system"] not in AVAILABLE_SYSTEMS:
            action_logger.error(f"Failed to create task: Invalid target system '{data['target_system']}'. Data: {data} - IP: {remote_addr}")
            return jsonify({"error": f"Invalid target system: {data['target_system']}"}), 400

        # Validate task action in description
        valid_action_found = False
        for available_action in AVAILABLE_TASK_ACTIONS:
            if data["description"].startswith(available_action):
                valid_action_found = True
                break
        if not valid_action_found:
            desc_snippet = data["description"][:70] # Log first 70 chars for context
            action_logger.error(f"Failed to create task: Description does not start with a valid task action. Desc: '{desc_snippet}...' - Data: {data} - IP: {remote_addr}")
            return jsonify({"error": f"Description must start with a valid predefined task action. Your description began: '{desc_snippet}...'."}), 400

        task = Task(
            name=data["name"],
            description=data["description"],
            date=data["date"],
            time=data["time"],
            target_system=data["target_system"],
            status=data.get("status", "pending")
        )
        tasks_db.append(task)
        save_tasks_to_file()
        action_logger.info(f"Task created: ID {task.id}, Name: '{task.name}', System: '{task.target_system}', Date: {task.date} - IP: {remote_addr}")
        return jsonify(task.to_dict()), 201
    except Exception as e:
        action_logger.error(f"Failed to create task. Data: {request.data if request else 'N/A'} - IP: {remote_addr} - Error: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500


@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    remote_addr = request.remote_addr
    filter_date_str = request.args.get('date')
    filter_week_str = request.args.get('week')
    filter_month_str = request.args.get('month')
    filter_year_str = request.args.get('year')

    action_logger.info(f"Attempted to retrieve tasks with filters: Date='{filter_date_str}', Week='{filter_week_str}', Month='{filter_month_str}', Year='{filter_year_str}' - IP: {remote_addr}")

    filtered_tasks = list(tasks_db) # Start with all tasks

    try:
        if filter_date_str:
            try:
                filter_date = isoparse(filter_date_str).date()
                filtered_tasks = [
                    task for task in filtered_tasks if isoparse(task.date).date() == filter_date
                ]
            except ValueError as e:
                action_logger.warning(f"Invalid date filter format: '{filter_date_str}'. Error: {e} - IP: {remote_addr}")

        if filter_week_str: # e.g., "2023-W45"
            try:
                year_str, week_num_str = filter_week_str.upper().split('-W')
                filter_iso_year = int(year_str)
                filter_iso_week = int(week_num_str)

                temp_tasks = []
                for task in filtered_tasks:
                    try:
                        task_date_obj = isoparse(task.date).date()
                        task_iso_year, task_iso_week, _ = task_date_obj.isocalendar()
                        if task_iso_year == filter_iso_year and task_iso_week == filter_iso_week:
                            temp_tasks.append(task)
                    except ValueError:
                        action_logger.warning(f"Could not parse date '{task.date}' for task ID '{task.id}' during week filtering. - IP: {remote_addr}")
                filtered_tasks = temp_tasks
            except ValueError as e:
                action_logger.warning(f"Invalid week filter format: '{filter_week_str}'. Expected YYYY-Www. Error: {e} - IP: {remote_addr}")


        if filter_month_str: # e.g., "2023-11"
            try:
                year_str, month_str = filter_month_str.split('-')
                filter_year = int(year_str)
                filter_month = int(month_str)
                filtered_tasks = [
                    task for task in filtered_tasks
                    if isoparse(task.date).year == filter_year and isoparse(task.date).month == filter_month
                ]
            except ValueError as e:
                action_logger.warning(f"Invalid month filter format: '{filter_month_str}'. Expected YYYY-MM. Error: {e} - IP: {remote_addr}")

        if filter_year_str: # e.g., "2023"
            try:
                filter_year = int(filter_year_str)
                filtered_tasks = [
                    task for task in filtered_tasks if isoparse(task.date).year == filter_year
                ]
            except ValueError as e:
                action_logger.warning(f"Invalid year filter format: '{filter_year_str}'. Error: {e} - IP: {remote_addr}")

        action_logger.info(f"Retrieved {len(filtered_tasks)} tasks with filters: Date='{filter_date_str}', Week='{filter_week_str}', Month='{filter_month_str}', Year='{filter_year_str}' - IP: {remote_addr}")
        return jsonify([task.to_dict() for task in filtered_tasks])

    except Exception as e:
        action_logger.error(f"Failed to retrieve/filter tasks - IP: {remote_addr} - Error: {e}")
        return jsonify({"error": "An unexpected error occurred while filtering tasks"}), 500


@app.route('/api/tasks/<task_id>', methods=['GET'])
def get_task(task_id):
    remote_addr = request.remote_addr
    try:
        task = next((t for t in tasks_db if t.id == task_id), None)
        if task:
            action_logger.info(f"Task retrieved: ID {task_id}, Name: '{task.name}' - IP: {remote_addr}")
            return jsonify(task.to_dict())
        else:
            action_logger.warning(f"Task not found: ID {task_id} - IP: {remote_addr}")
            return jsonify({"error": "Task not found"}), 404
    except Exception as e:
        action_logger.error(f"Failed to retrieve task: ID {task_id} - IP: {remote_addr} - Error: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@app.route('/api/tasks/<task_id>', methods=['PUT'])
def update_task(task_id):
    remote_addr = request.remote_addr
    try:
        task = next((t for t in tasks_db if t.id == task_id), None)
        if not task:
            action_logger.warning(f"Attempted to update non-existent task: ID {task_id} - IP: {remote_addr}")
            return jsonify({"error": "Task not found"}), 404

        data = request.json
        if not data:
            action_logger.error(f"Failed to update task: Invalid input (empty data) for ID {task_id} - IP: {remote_addr}")
            return jsonify({"error": "Invalid input"}), 400

        # Validate name if provided
        if "name" in data and (not data["name"] or not data["name"].strip()):
            action_logger.error(f"Failed to update task {task_id}: Name cannot be empty. Data: {data} - IP: {remote_addr}")
            return jsonify({"error": "Task name cannot be empty"}), 400

        # Validate date format if provided
        if "date" in data:
            try:
                isoparse(data["date"])
            except ValueError:
                action_logger.error(f"Failed to update task {task_id}: Invalid date format for {data['date']}. Data: {data} - IP: {remote_addr}")
                return jsonify({"error": "Invalid date format. Please use YYYY-MM-DD."}), 400

        # Validate target system if provided
        if "target_system" in data and data["target_system"] not in AVAILABLE_SYSTEMS:
            action_logger.error(f"Failed to update task {task_id}: Invalid target system '{data['target_system']}'. Data: {data} - IP: {remote_addr}")
            return jsonify({"error": f"Invalid target system: {data['target_system']}"}), 400

        # Validate task action in description if provided
        if "description" in data:
            valid_action_found = False
            for available_action in AVAILABLE_TASK_ACTIONS:
                if data["description"].startswith(available_action):
                    valid_action_found = True
                    break
            if not valid_action_found:
                desc_snippet = data["description"][:70] # Log first 70 chars for context
                action_logger.error(f"Failed to update task {task_id}: Description does not start with a valid task action. Desc: '{desc_snippet}...' - Data: {data} - IP: {remote_addr}")
                return jsonify({"error": f"Description must start with a valid predefined task action. Your description began: '{desc_snippet}...'."}), 400

        task.name = data.get("name", task.name)
        task.description = data.get("description", task.description)
        task.date = data.get("date", task.date)
        task.time = data.get("time", task.time)
        task.target_system = data.get("target_system", task.target_system)
        task.status = data.get("status", task.status)

        save_tasks_to_file()
        action_logger.info(f"Task updated: ID {task_id}, Name: '{task.name}', System: '{task.target_system}', Date: {task.date} - IP: {remote_addr}")
        return jsonify(task.to_dict())
    except Exception as e:
        action_logger.error(f"Failed to update task: ID {task_id}. Data: {request.data if request else 'N/A'} - IP: {remote_addr} - Error: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    remote_addr = request.remote_addr
    global tasks_db
    try:
        task_index = next((i for i, t in enumerate(tasks_db) if t.id == task_id), None)
        if task_index is not None:
            tasks_db.pop(task_index)
            save_tasks_to_file()
            action_logger.info(f"Task deleted: ID {task_id} - IP: {remote_addr}")
            return jsonify({"message": "Task deleted successfully"}), 200
        else:
            action_logger.warning(f"Attempted to delete non-existent task: ID {task_id} - IP: {remote_addr}")
            return jsonify({"error": "Task not found"}), 404
    except Exception as e:
        action_logger.error(f"Failed to delete task: ID {task_id} - IP: {remote_addr} - Error: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500

if __name__ == '__main__':
    # Default to values suitable for development if not set in environment
    # FLASK_DEBUG: '1' or 'true' (case-insensitive) for True, '0' or 'false' for False.
    # Defaults to True if variable is not set or value is not recognized as False.
    flask_debug_env = os.environ.get('FLASK_DEBUG', '1').lower()
    debug_mode = flask_debug_env in ['true', '1', 't', 'yes']

    default_port = 8080 # User preferred default
    port_env = os.environ.get('FLASK_RUN_PORT')
    port = default_port
    if port_env:
        try:
            port = int(port_env)
        except ValueError:
            print(f"Warning: Invalid FLASK_RUN_PORT value '{port_env}'. Using default port {default_port}.")

    # Get host from environment variable, default to '0.0.0.0' to be accessible on network
    host = os.environ.get('FLASK_RUN_HOST', '0.0.0.0')

    print(f"--- Starting Flask development server ---")
    print(f" * FLASK_APP: backend.app:app (Set this env var if using 'flask run')")
    print(f" * Mode: {'debug' if debug_mode else 'production'}")
    print(f" * Running on: http://{host}:{port}/ (Press CTRL+C to quit)")
    print(f" * To override, set FLASK_DEBUG (0 or 1), FLASK_RUN_PORT (e.g., 8080), FLASK_RUN_HOST (e.g., 127.0.0.1).")

    app.run(host=host, port=port, debug=debug_mode)


@app.route('/api/config/options', methods=['GET'])
def get_config_options():
    remote_addr = request.remote_addr if request else 'N/A'
    try:
        options = {
            "systems": AVAILABLE_SYSTEMS,
            "actions": AVAILABLE_TASK_ACTIONS
        }
        action_logger.info(f"Configuration options requested - IP: {remote_addr}")
        return jsonify(options), 200
    except Exception as e:
        action_logger.error(f"Error fetching config options - IP: {remote_addr} - Error: {str(e)}")
        return jsonify({"error": "Could not retrieve configuration options"}), 500
