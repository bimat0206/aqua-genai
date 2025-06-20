import json
import logging
import uuid
from datetime import datetime
import os

from utils.logger_config import setup_logging
from config import Config

from services.s3_service import S3Service
from services.bedrock_service import BedrockService
from services.dynamodb_service import DynamoDBService

setup_logging()
logger = logging.getLogger(__name__)

s3_dataset_service = S3Service(Config.AWS_DATASET_BUCKET)
s3_input_img_validation_service = S3Service(Config.AWS_IMPUT_IMG_VALIDATION_BUCKET)
bedrock_service = BedrockService(
    model_id=Config.AWS_MODEL_ID,
    model_region=Config.AWS_MODEL_REGION,
    max_tokens=Config.AWS_MODEL_MAX_TOKENS,
    temperature=Config.AWS_MODEL_TEMPERATURE
)
dynamodb_service = DynamoDBService(Config.AWS_RESULT_TABLE)

def lambda_handler(event, context):
    logger.info(f"Lambda handler triggered. Request ID: {context.aws_request_id}")

    product_id = None
    product_category = None
    uploaded_label_image_key = None
    uploaded_overview_image_key = None

    try:
        body = json.loads(event.get("body", "{}"))
        
        product_id = body.get("product_id")
        product_category = body.get("product_category")
        uploaded_label_image_key = body.get("uploaded_label_image_key")
        uploaded_overview_image_key = body.get("uploaded_overview_image_key")

        if not product_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing 'product_id' in request body"})
            }
        if not product_category:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing 'product_category' in request body"})
            }
        if not uploaded_label_image_key:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing 'uploaded_label_image_key' in request body"})
            }
        if not uploaded_overview_image_key:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing 'uploaded_overview_image_key' in request body"})
            }
        
        logger.debug(f"Received Product ID: {product_id}, Category: {product_category}")
        logger.debug(f"Uploaded Label Key: {uploaded_label_image_key}")
        logger.debug(f"Uploaded Overview Key: {uploaded_overview_image_key}")

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON format in request body: {str(e)}")
        return {
            "statusCode": 400,
            "body": json.dumps({"error": f"Invalid JSON format: {str(e)}"})
        }
    except Exception as e:
        logger.error(f"Error parsing request body: {e}", exc_info=True)
        return {
            "statusCode": 400,
            "body": json.dumps({"error": f"Invalid request format: {str(e)}"})
        }

    try:
        uploaded_label_image_bytes = s3_input_img_validation_service.get_image_bytes(uploaded_label_image_key)
        uploaded_overview_image_bytes = s3_input_img_validation_service.get_image_bytes(uploaded_overview_image_key)

        reference_label_folder = f"dataset/{product_category}/{product_id}/TEM NL/"
        reference_frontview_folder = f"dataset/{product_category}/{product_id}/CHÍNH DIỆN/"
        reference_web_folder = f"dataset/{product_category}/{product_id}/HÌNH WEB/"

        reference_label_keys = s3_dataset_service.list_keys(reference_label_folder, max_files=Config.MAX_REFERENCE_LABEL_IMAGES)
        reference_overview_keys = (
            # s3_dataset_service.list_keys(reference_frontview_folder, max_files=Config.MAX_REFERENCE_OVERVIEW_IMAGES)
            s3_dataset_service.list_keys(reference_web_folder, max_files=Config.MAX_REFERENCE_OVERVIEW_IMAGES)
        )

        if not reference_label_keys:
            logger.warning(f"No reference label images found for product ID {product_id} in {reference_label_folder}.")
            return {
                "statusCode": 404,
                "body": json.dumps({"error": f"No reference label images found for product ID {product_id}"})
            }
        if not reference_overview_keys:
            logger.warning(f"No reference overview images found for product ID {product_id} in {reference_frontview_folder} and {reference_web_folder}.")
            return {
                "statusCode": 404,
                "body": json.dumps({"error": f"No reference overview images found for product ID {product_id}"})
            }

        base64_reference_label_images_with_types = [
            (s3_dataset_service._get_base64_from_bytes(s3_dataset_service.get_image_bytes(key)), s3_dataset_service.get_image_media_type(key))
            for key in reference_label_keys
        ]

        base64_reference_overview_images_with_types = [
            (s3_dataset_service._get_base64_from_bytes(s3_dataset_service.get_image_bytes(key)), s3_dataset_service.get_image_media_type(key))
            for key in reference_overview_keys
        ]

        result_text = bedrock_service.get_check_response(
            uploaded_label_image_bytes=uploaded_label_image_bytes,
            uploaded_overview_image_bytes=uploaded_overview_image_bytes,
            reference_label_images_with_types=base64_reference_label_images_with_types,
            reference_overview_images_with_types=base64_reference_overview_images_with_types,
            product_id=product_id,
            product_category=product_category
        )

        item_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        dynamo_item = {
            "id": item_id,
            "timestamp": timestamp,
            "productId": product_id,
            "productCategory": product_category,
            "uploadedLabelImageKey": uploaded_label_image_key,
            "uploadedOverviewImageKey": uploaded_overview_image_key,
            "bedrockResponse": result_text
        }

        dynamodb_service.insert_item(dynamo_item)
        logger.info(f"Successfully inserted result into DynamoDB with ID: {item_id}")

        return {
            "statusCode": 200,
            "body": json.dumps({"result": result_text['content'], "transactionId": item_id})
        }

    except FileNotFoundError as e:
        logger.error(f"File not found error: {e}", exc_info=True)
        return {
            "statusCode": 404,
            "body": json.dumps({"error": str(e)})
        }
    except ValueError as e:
        logger.error(f"Configuration or data error: {e}", exc_info=True)
        return {
            "statusCode": 400,
            "body": json.dumps({"error": str(e)})
        }
    except Exception as e:
        logger.exception(f"Failed during Lambda processing for Product ID {product_id}, Category {product_category}: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Internal server error."})
        }