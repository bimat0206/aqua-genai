import boto3
import logging
import json
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class DynamoDBService:
    def __init__(self, table_name):
        self.dynamodb_client = boto3.client("dynamodb")
        self.table_name = table_name
        if not self.table_name:
            raise ValueError("DynamoDB table name is not configured.")
        logger.info(f"DynamoDBService initialized for table: {self.table_name}")

    def insert_item(self, item):
        logger.debug(f"Attempting to insert item into DynamoDB table '{self.table_name}': {item}")
        try:
            response = self.dynamodb_client.put_item(
                TableName=self.table_name,
                Item=self._serialize_item(item)
            )
            logger.info(f"Successfully inserted item into DynamoDB table '{self.table_name}'.")
            return response
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            logger.error(f"Error inserting item into DynamoDB: {error_code} - {e}")
            raise
        except Exception as e:
            logger.exception(f"An unexpected error occurred during DynamoDB insert: {e}")
            raise

    def _serialize_item(self, item):
        serialized_item = {}
        for k, v in item.items():
            if isinstance(v, str):
                serialized_item[k] = {'S': v}
            elif isinstance(v, (int, float)):
                serialized_item[k] = {'N': str(v)}
            elif isinstance(v, bool):
                serialized_item[k] = {'BOOL': v}
            elif isinstance(v, list):
                serialized_item[k] = {'L': [self._serialize_item_value(elem) for elem in v]}
            elif isinstance(v, dict):
                serialized_item[k] = {'M': self._serialize_item(v)}
            elif v is None:
                serialized_item[k] = {'NULL': True}
            else:
                logger.warning(f"Serializing unsupported type for key '{k}': {type(v)}. Converting to string.")
                serialized_item[k] = {'S': json.dumps(v)}
        return serialized_item

    def _serialize_item_value(self, value):
        if isinstance(value, str):
            return {'S': value}
        elif isinstance(value, (int, float)):
            return {'N': str(value)}
        elif isinstance(value, bool):
            return {'BOOL': value}
        elif isinstance(value, list):
            return {'L': [self._serialize_item_value(elem) for elem in value]}
        elif isinstance(value, dict):
            return {'M': self._serialize_item(value)}
        elif value is None:
            return {'NULL': True}
        else:
            logger.warning(f"Serializing unsupported nested type: {type(value)}. Converting to string.")
            return {'S': json.dumps(value)}