# Aqua Product Display with GenAI

This README provides a comprehensive overview of the Aqua Product Display solution, which verifies product images with energy stamps using a GenAI model. It covers architecture, module responsibilities, data flow, configuration, error handling, and usage.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Module Descriptions](#module-descriptions)

   * [Configuration & Logging](#configuration--logging)
   * [S3Service](#s3service)
   * [DynamoDBService](#dynamodbservice)
   * [BedrockService](#bedrockservice)
   * [Lambda Handler (index.py)](#lambda-handler-indexpy)
4. [Overall Data Flow](#overall-data-flow)
5. [Error Handling](#error-handling)
6. [Deployment & Environment](#deployment--environment)
7. [Usage Example](#usage-example)
8. [Extending & Customization](#extending--customization)
9. [License](#license)

---

## Introduction

This project is a sophisticated cloud-based solution designed to automate the verification of in-store product displays for the brand Aqua. It leverages Generative AI to perform a detailed visual comparison between images of products in a retail environment and a set of official, internal reference images.

The primary goal is to ensure that the product's energy label and its overall physical appearance are 100% accurate and compliant with Aqua's stringent internal standards. The system identifies the product, analyzes its features, compares it against a known-good dataset, and logs the results for internal auditing.

## Architecture Overview
The solution is built on a serverless architecture using Amazon Web Services (AWS), ensuring scalability, maintainability, and cost-efficiency.

The key components are:

AWS Lambda: The core of the application is a Lambda function that orchestrates the entire verification workflow. It is triggered by an API call containing information about the product to be verified.

Amazon S3 (Simple Storage Service): S3 is used for all image storage needs. There are two primary buckets:

An Input Bucket (AWS_IMPUT_IMG_VALIDATION_BUCKET) to store the uploaded images from the retail environment (the product overview and its label).

A Dataset Bucket (AWS_DATASET_BUCKET) that holds the curated, official reference images for every product, organized by category and ID.

Amazon Bedrock: This is the managed service used to invoke the powerful Generative AI model. Bedrock is responsible for understanding the visual and textual data provided and executing the detailed comparison based on a sophisticated prompt.

Amazon DynamoDB: A NoSQL database used to store the results of every verification transaction. Each record includes the AI's detailed JSON response, transaction ID, and metadata about the request.
```

Incoming API Request
        │
v
Lambda Handler (index.py)
        │
┌──────────┴──────────┐
│                     │
v                     v
S3Service         DynamoDBService
│                     │
v                     v
Retrieve images       Persist results
        │
v
BedrockService
│
v
Invoke GenAI model
│
v
Parse verdict
│
v
Return response + store in DynamoDB
```

* **Serverless**: Runs in AWS Lambda behind an HTTP API Gateway.
* **Storage**: Uses Amazon S3 for images and DynamoDB for persistence.
* **AI**: Uses Amazon Bedrock Claude model for image verification.

## Module Descriptions

### Configuration & Logging

* **`config.py`**

  * Reads environment variables: model ID, bucket names, DynamoDB table, image limits, prompt templates.
  * Defines category-specific prompt templates to guide the GenAI model.

* **`logger_config.py`**

  * Sets up Python logging based on `LOG_LEVEL`.
  * Suppresses AWS SDK logs unless debug mode is enabled.

### S3Service

File: `s3_service.py`

Responsibilities:

* **List Objects**: Retrieves up to `MAX_REFERENCE_*` object keys under a given prefix, sorted by last-modified.
* **Fetch Object**: Downloads image bytes from S3, Base64-encodes, and infers media type by extension (JPEG, PNG, WebP).

Key Methods:

* `list_keys(prefix: str, max_keys: int) -> List[str]`
* `get_base64_object(bucket: str, key: str) -> Tuple[str, str]`
  Returns `(base64_string, media_type)`.

### DynamoDBService

File: `dynamodb_service.py`

Responsibilities:

* **Persist Results**: Writes verification metadata (product ID, category, timestamp, image keys, model verdict, raw response) to DynamoDB.
* **Type Translation**: Converts Python primitives (str, int, bool, list, dict) into DynamoDB wire format.

Key Method:

* `put_item(item: Dict[str, Any]) -> None`

### BedrockService

File: `bedrock_service.py`

Responsibilities:

* **Payload Assembly**: Builds the JSON request containing:

  1. Text prompt (from `Config.PROMPT_TEMPLATE`),
  2. Base64-encoded uploaded label + overview images,
  3. Base64-encoded reference images with media types.
* **Model Invocation**: Calls Bedrock (`client.invoke_model`) with assembled payload and processes the response.
* **Response Parsing**: Extracts and JSON-parses the model’s output verdict (e.g., `"match": true/false`).

Key Method:

* `get_check_response(uploaded: List[ImageData], reference: List[ImageData], meta: Meta) -> Dict[str, Any]`

### Lambda Handler (`index.py`)

Responsibilities:

1. **Validate Input**: Ensure `product_id`, `category`, and image S3 keys for `label` and `overview` are present.
2. **Fetch Uploaded Images**: From the validation bucket.
3. **List & Fetch Reference Images**: From the dataset bucket (up to configured limits).
4. **Invoke Verification**: Call `BedrockService.get_check_response(...)`.
5. **Persist & Respond**:

   * Generate `transaction_id` (UUID) and timestamp.
   * Save record via `DynamoDBService`.
   * Return JSON response with `match` verdict and `transaction_id`.

Entry Point:

```python
handler(event, context) -> Dict[str, Any]
```

## Overall Data Flow

The verification process is a seamless, step-by-step workflow orchestrated by the main Lambda function.

1.Trigger: The lambda_handler function in src/index.py is invoked, typically via an API Gateway endpoint. The request body must contain the product_id, product_category, and the S3 keys for the uploaded uploaded_label_image_key and uploaded_overview_image_key.

2.Image Fetching: The system fetches the two uploaded images from the AWS_IMPUT_IMG_VALIDATION_BUCKET using the S3Service.

3.Reference Image Retrieval: Based on the product_category and product_id, the system constructs paths to the official reference images in the AWS_DATASET_BUCKET. It then lists and fetches the most recent label and overview images using the S3Service.

4.Prompt Construction: This is a critical step where the BedrockService assembles a detailed, multi-modal prompt. It encodes all images (uploaded and reference) into base64 format and combines them with the instructional text from config.py.

5.AI Model Invocation: The fully constructed request body, containing the persona, instructions, and all images, is sent to the Amazon Bedrock API to invoke the specified AI model (AWS_MODEL_ID).

6.Response Handling: The AI model returns a detailed JSON object containing its analysis. The BedrockService parses this response.

7.Result Storage: The DynamoDBService creates a new item with a unique transaction ID (uuid.uuid4()) and inserts the complete AI response, along with request metadata, into the AWS_RESULT_TABLE.

8.Return Response: The Lambda function returns a 200 OK status code to the original caller, including the AI's findings and the unique transactionId for future reference.

## Prompt Engineering
The success of this solution hinges on its advanced prompt engineering, defined in src/config.py. The prompt is dynamically constructed and provides the AI with a clear role, a detailed protocol, and the data it needs to perform its task accurately.

System Prompt (get_context_prompt_text): This sets the AI's persona. It instructs the model to act as a "highly meticulous internal retail display inspector" for Aqua, establishing the context of an internal audit rather than a public-facing query.

Action Prompt (get_action_prompt_text): This is a highly detailed, multi-step protocol that the AI must follow. It is broken down into two main phases:

Phase 1: Label Verification: A step-by-step guide for comparing the uploaded label image against the reference labels. It requires the AI to check for an exact match in the product code, layout, and text.

Phase 2: Product Overview Verification: A guide for comparing the overall product image. This prompt dynamically injects a list of specific features to check based on the product_category (e.g., handle design for refrigerators, stand design for TVs), forcing the AI to perform a rigorous, feature-by-feature visual inspection.

Strict JSON Output: The prompt concludes by mandating that the output must be in a strict JSON format with specific keys (matchLabelToReference, label_explanation, etc.) and a confidence score for each judgment. It also enforces a confidence threshold of 0.85 for a 'yes' decision, defaulting to 'no' if the confidence is lower to ensure high accuracy.



## Error Handling

* **Missing Parameters**: Returns `400 Bad Request` with descriptive error message.
* **S3 Errors** (NotFound, permissions): Returns `500 Internal Server Error` with context.
* **No Reference Images**: Returns `404 Not Found` if no references under prefix.
* **Bedrock Failures**: Catches invocation errors, logs raw messages, returns `502 Bad Gateway`.
* **DynamoDB Errors**: Logs and returns `500 Internal Server Error`.

## Deployment & Environment

* **AWS Lambda** with appropriate IAM roles for S3, Bedrock, DynamoDB.
* **Environment Variables**:

  ```bash
  MODEL_ID=
  VALIDATION_BUCKET=
  DATASET_BUCKET=
  DYNAMO_TABLE=
  MAX_REFERENCE_LABEL_IMAGES=
  MAX_REFERENCE_OVERVIEW_IMAGES=
  LOG_LEVEL=
  ```
* **Cold Start Considerations**: Batch S3 calls and reuse Bedrock client.

## Usage Example

```bash
curl -X POST https://<api-gateway>/verify \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "12345",
    "category": "kitchen-appliance",
    "label_key": "validate/12345/label.jpg",
    "overview_key": "validate/12345/overview.png"
  }'
```

Response:

```json
{
  "transaction_id": "a1b2c3d4-...",
  "match": true
}
```

## Extending & Customization

* **Prompts**: Update templates in `config.py` to refine GenAI instructions.
* **Image Limits**: Adjust max reference counts via env vars.
* **Parallelization**: Fetch multiple S3 objects in parallel to reduce latency.
* **Retry Logic**: Add exponential backoff for Bedrock and DynamoDB calls.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
