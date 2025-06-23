import json
import logging
import uuid
from datetime import datetime
import os
import base64

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

def get_cors_headers():
    """Return standard CORS headers for all responses"""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent",
        "Access-Control-Allow-Methods": "OPTIONS,POST"
    }

def lambda_handler(event, context):
    logger.info(f"Lambda handler triggered. Request ID: {context.aws_request_id}")

    product_id = None
    product_category = None
    uploaded_label_image_key = None
    uploaded_overview_image_key = None

    try:
        body = json.loads(event.get("body", "{}"))
        
        # Support both old format (S3 keys) and new format (direct base64 data)
        product_id = body.get("product_id") or body.get("productId")
        product_category = body.get("product_category") or body.get("category")
        uploaded_label_image_key = body.get("uploaded_label_image_key")
        uploaded_overview_image_key = body.get("uploaded_overview_image_key")
        
        # New format: direct base64 data
        label_image_data = body.get("labelImage")
        overview_image_data = body.get("overviewImage")

        if not product_id:
            return {
                "statusCode": 400,
                "headers": get_cors_headers(),
                "body": json.dumps({"error": "Missing 'product_id' in request body"})
            }
        if not product_category:
            return {
                "statusCode": 400,
                "headers": get_cors_headers(),
                "body": json.dumps({"error": "Missing 'product_category' in request body"})
            }
        # Check if we have either S3 keys or direct image data
        if not uploaded_label_image_key and not label_image_data:
            return {
                "statusCode": 400,
                "headers": get_cors_headers(),
                "body": json.dumps({"error": "Missing 'uploaded_label_image_key' or 'labelImage' in request body"})
            }
        if not uploaded_overview_image_key and not overview_image_data:
            return {
                "statusCode": 400,
                "headers": get_cors_headers(),
                "body": json.dumps({"error": "Missing 'uploaded_overview_image_key' or 'overviewImage' in request body"})
            }
        
        logger.debug(f"Received Product ID: {product_id}, Category: {product_category}")
        logger.debug(f"Uploaded Label Key: {uploaded_label_image_key}")
        logger.debug(f"Uploaded Overview Key: {uploaded_overview_image_key}")

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON format in request body: {str(e)}")
        return {
            "statusCode": 400,
            "headers": get_cors_headers(),
            "body": json.dumps({"error": f"Invalid JSON format: {str(e)}"})
        }
    except Exception as e:
        logger.error(f"Error parsing request body: {e}", exc_info=True)
        return {
            "statusCode": 400,
            "headers": get_cors_headers(),
            "body": json.dumps({"error": f"Invalid request format: {str(e)}"})
        }

    try:
        # Handle both S3 keys and direct base64 data
        if uploaded_label_image_key:
            uploaded_label_image_bytes = s3_input_img_validation_service.get_image_bytes(uploaded_label_image_key)
        else:
            # Handle direct base64 data (remove data URL prefix if present)
            if label_image_data.startswith('data:'):
                label_image_data = label_image_data.split(',')[1]
            uploaded_label_image_bytes = base64.b64decode(label_image_data)
            
        if uploaded_overview_image_key:
            uploaded_overview_image_bytes = s3_input_img_validation_service.get_image_bytes(uploaded_overview_image_key)
        else:
            # Handle direct base64 data (remove data URL prefix if present)
            if overview_image_data.startswith('data:'):
                overview_image_data = overview_image_data.split(',')[1]
            uploaded_overview_image_bytes = base64.b64decode(overview_image_data)

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
                "headers": get_cors_headers(),
                "body": json.dumps({"error": f"No reference label images found for product ID {product_id}"})
            }
        if not reference_overview_keys:
            logger.warning(f"No reference overview images found for product ID {product_id} in {reference_frontview_folder} and {reference_web_folder}.")
            return {
                "statusCode": 404,
                "headers": get_cors_headers(),
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
        
        # Convert reference image keys to comma-separated string for storage
        reference_images_str = ",".join(reference_overview_keys) if reference_overview_keys else None
        logger.debug(f"Reference images from HÌNH WEB folder: {reference_images_str}")
        
        dynamo_item = {
            "id": item_id,
            "timestamp": timestamp,
            "productId": product_id,
            "productCategory": product_category,
            "uploadedLabelImageKey": uploaded_label_image_key or "direct_base64_data",
            "uploadedOverviewImageKey": uploaded_overview_image_key or "direct_base64_data",
            "uploadedReferenceImageKey": reference_images_str,
            "bedrockResponse": result_text
        }

        dynamodb_service.insert_item(dynamo_item)
        logger.info(f"Successfully inserted result into DynamoDB with ID: {item_id}")

        # Extract the parsed JSON content from the Bedrock response
        if ('content' in result_text and 
            isinstance(result_text['content'], list) and 
            len(result_text['content']) > 0 and 
            'text' in result_text['content'][0]):
            
            parsed_content = result_text['content'][0]['text']
            
            # If it's already parsed as JSON object, use it directly
            if isinstance(parsed_content, dict):
                response_data = parsed_content
            else:
                # If it's still a string, return it as is (fallback)
                response_data = {"raw_response": parsed_content}
        else:
            # Fallback if structure is unexpected
            response_data = {"raw_response": result_text}

        return {
            "statusCode": 200,
            "headers": get_cors_headers(),
            "body": json.dumps({
                "matchLabelToReference": response_data.get("matchLabelToReference", "unknown"),
                "matchLabelToReference_confidence": response_data.get("matchLabelToReference_confidence", 0),
                "label_explanation": response_data.get("label_explanation", ""),
                "matchOverviewToReference": response_data.get("matchOverviewToReference", "unknown"),
                "matchOverviewToReference_confidence": response_data.get("matchOverviewToReference_confidence", 0),
                "overview_explanation": response_data.get("overview_explanation", ""),
                "transactionId": item_id
            })
        }

    except FileNotFoundError as e:
        logger.error(f"File not found error: {e}", exc_info=True)
        return {
            "statusCode": 404,
            "headers": get_cors_headers(),
            "body": json.dumps({"error": str(e)})
        }
    except ValueError as e:
        logger.error(f"Configuration or data error: {e}", exc_info=True)
        return {
            "statusCode": 400,
            "headers": get_cors_headers(),
            "body": json.dumps({"error": str(e)})
        }
    except Exception as e:
        logger.exception(f"Failed during Lambda processing for Product ID {product_id}, Category {product_category}: {e}")
        return {
            "statusCode": 500,
            "headers": get_cors_headers(),
            "body": json.dumps({"error": "Internal server error."})
        }