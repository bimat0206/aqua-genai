import boto3
import json
import base64
import logging
from config import Config

logger = logging.getLogger(__name__)

class BedrockService:
    def __init__(self, model_id, model_region, max_tokens, temperature):
        self.model_id = model_id
        self.bedrock_runtime_client = boto3.client(service_name='bedrock-runtime', region_name=model_region)
        self.max_tokens = max_tokens
        self.temperature = temperature
        if not self.model_id:
            raise ValueError("Bedrock model ID is not configured.")
        logger.info(f"BedrockService initialized with model: {self.model_id} in region: {model_region}")

    def _get_base64_from_bytes(self, image_bytes):
        return base64.b64encode(image_bytes).decode("utf-8")

    def _get_check_request_body(self,
                                uploaded_label_image_bytes,
                                uploaded_overview_image_bytes,
                                reference_label_images_with_types,
                                reference_overview_images_with_types,
                                product_id,
                                product_category):

        logger.debug(f"Building request body for Claude model for product {product_id}.")

        user_content = [
            {"type": "text", "text": Config.get_action_prompt_text(product_id, product_category, Config.MAX_REFERENCE_LABEL_IMAGES, Config.MAX_REFERENCE_OVERVIEW_IMAGES)},
            # 1. Uploaded Label Image
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": self._get_base64_from_bytes(uploaded_label_image_bytes)
                }
            },
            # 2. Uploaded Overview Image
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": self._get_base64_from_bytes(uploaded_overview_image_bytes)
                }
            }
        ]

        # 3. Inject Reference Label Images dynamically
        for ref_img_data, ref_img_media_type in reference_label_images_with_types:
            user_content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": ref_img_media_type,
                    "data": ref_img_data
                }
            })

        # 4. Inject Reference Overview Images dynamically
        for ref_img_data, ref_img_media_type in reference_overview_images_with_types:
            user_content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": ref_img_media_type,
                    "data": ref_img_data
                }
            })

        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "system": Config.get_context_prompt_text(product_id),
            "messages": [
                {
                    "role": "user",
                    "content": user_content
                }
            ],
        }
        logger.debug("Request body created successfully.")
        return json.dumps(body)

    def get_check_response(self,
                           uploaded_label_image_bytes,
                           uploaded_overview_image_bytes,
                           reference_label_images_with_types,
                           reference_overview_images_with_types,
                           product_id,
                           product_category):

        logger.info(f"Sending request to Bedrock model: {self.model_id}.")
            
        body = self._get_check_request_body(
            uploaded_label_image_bytes,
            uploaded_overview_image_bytes,
            reference_label_images_with_types,
            reference_overview_images_with_types,
            product_id,
            product_category
        )

        logger.debug("Invoking Bedrock model with prepared body.")
        response = self.bedrock_runtime_client.invoke_model(
            body=body,
            modelId=self.model_id,
            contentType="application/json",
            accept="application/json"
        )

        logger.info("Bedrock model responded successfully.")
        response_body = json.loads(response.get('body').read())

        if 'content' in response_body and isinstance(response_body['content'], list) and len(response_body['content']) > 0 and 'text' in response_body['content'][0]:
            try:
                parsed_text_content = json.loads(response_body['content'][0]['text'])
                response_body['content'][0]['text'] = parsed_text_content
            except json.JSONDecodeError:
                logger.warning(f"Bedrock response 'content' field is not a valid JSON string. Storing as raw text. Content: {response_body['content'][0]['text']}", exc_info=True)
        return response_body