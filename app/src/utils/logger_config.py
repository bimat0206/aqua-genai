import os
import logging

def setup_logging():
    log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    )
    logging.getLogger().setLevel(log_level)
    
    # Silence boto3 and botocore logs unless specific level is set
    if log_level not in ["DEBUG"]:
        logging.getLogger('boto3').setLevel(logging.WARNING)
        logging.getLogger('botocore').setLevel(logging.WARNING)
        logging.getLogger('urllib3').setLevel(logging.WARNING)