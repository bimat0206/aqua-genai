import boto3
import logging
import os
import base64
from config import Config

logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self, bucket_name):
        self.s3_client = boto3.client("s3")
        self.bucket_name = bucket_name
        if not self.bucket_name:
            raise ValueError("S3 bucket name is not configured.")
        logger.info(f"S3Service initialized for bucket: {self.bucket_name}")

    def _get_base64_from_bytes(self, image_bytes):
        return base64.b64encode(image_bytes).decode("utf-8")

    def get_image_bytes(self, key):
        logger.info(f"Fetching image from S3 bucket: {self.bucket_name}, key: {key}")
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=key)
            image_bytes = response["Body"].read()
            logger.debug(f"Image '{key}' fetched from S3 successfully.")
            return image_bytes
        except self.s3_client.exceptions.NoSuchKey:
            logger.error(f"Image '{key}' not found in bucket '{self.bucket_name}'.")
            raise FileNotFoundError(f"Image '{key}' not found.")
        except Exception as e:
            logger.exception(f"Failed to read image from S3 for key '{key}': {e}")
            raise

    def get_image_media_type(self, key):
        ext = os.path.splitext(key)[1].lower()
        if ext in ['.jpg', '.jpeg']:
            return 'image/jpeg'
        elif ext == '.png':
            return 'image/png'
        elif ext == '.webp':
            return 'image/webp'
        else:
            logger.warning(f"Unsupported image extension for key: {key}. Defaulting to image/jpeg.")
            return 'image/jpeg'

    def list_keys(self, prefix, max_files):
        logger.info(f"Listing objects under S3 prefix: {self.bucket_name}/{prefix}")
        response = self.s3_client.list_objects_v2(Bucket=self.bucket_name, Prefix=prefix)
        if 'Contents' not in response:
            logger.info(f"No objects found under prefix: {prefix}")
            return []
        
        keys = [obj['Key'] for obj in sorted(response['Contents'], key=lambda x: x['LastModified'], reverse=True)
                if not obj['Key'].endswith('/') and obj['Key'].lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
        
        logger.debug(f"Found {len(keys)} image keys, returning top {max_files}.")
        return keys[:max_files]