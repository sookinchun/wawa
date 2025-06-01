import logging
import os

def setup_logger(name='action_logger', log_file='../logs/actions.log', level=logging.INFO):
    """
    Sets up a logger that writes to a specified file.
    """
    # Create the logs directory if it doesn't exist
    log_dir = os.path.dirname(log_file)
    if log_dir and not os.path.exists(log_dir): # Ensure log_dir is not empty before checking existence
        try:
            os.makedirs(log_dir, exist_ok=True)
        except OSError as e:
            # Use a basic print logger if directory creation fails
            print(f"Warning: Could not create log directory {log_dir}. Error: {e}. Logging to console.")
            # Fallback to basic console logging if file setup fails
            logging.basicConfig(level=level, format='%(asctime)s - %(levelname)s - %(message)s')
            return logging.getLogger(name)


    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Prevent adding multiple handlers if logger is already configured
    if not logger.handlers:
        # Create a file handler
        try:
            fh = logging.FileHandler(log_file)
            fh.setLevel(level)

            # Create a formatter and set it for the file handler
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            fh.setFormatter(formatter)

            # Add the file handler to the logger
            logger.addHandler(fh)
        except IOError as e:
            print(f"Warning: Could not set up file handler for {log_file}. Error: {e}. Logging to console.")
            # Fallback to basic console logging if file setup fails
            logging.basicConfig(level=level, format='%(asctime)s - %(levelname)s - %(message)s')
            return logging.getLogger(name) # Return the basic configured logger

    return logger

# Instantiate a logger
action_logger = setup_logger()
