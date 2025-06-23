# Changelog - Aqua GenAI Lambda App

All notable changes to the Lambda verification function will be documented in this file.

## [1.2] - 2025-06-21

### Fixed
- **JSON Response Format** - Fixed API response to return proper JSON structure instead of nested arrays
  - BedrockService now properly extracts JSON from markdown code blocks (```json ... ```)
  - Lambda handler returns clean JSON with direct field access instead of nested result arrays
  - API responses now have consistent structure: `matchLabelToReference`, `matchLabelToReference_confidence`, etc.
  - Enhanced error handling for malformed AI model responses

### Technical Details
- Modified `bedrock_service.py` to parse JSON from markdown code blocks in AI responses
- Updated `lambda_handler()` in `src/index.py` to return structured JSON response
- Added fallback handling for various AI response formats
- Updated sample data in `result.json` to reflect new response structure

## [1.1] - 2025-06-21

### Changed
- **uploadedReferenceImageKey field behavior** - Modified to automatically populate from S3 reference images
  - Lambda function now automatically queries reference images from S3 bucket's "HÌNH WEB" folder
  - Field is populated with comma-separated list of reference image S3 keys used for comparison
  - Removed `uploaded_reference_image_key` parameter from request body (no longer needed from users)
  - Enhanced transparency by showing exactly which reference images were used for validation

### Technical Details
- Modified `lambda_handler()` in `src/index.py` to automatically populate reference image keys
- Reference images are retrieved from `dataset/{product_category}/{product_id}/HÌNH WEB/` folder
- DynamoDB `uploadedReferenceImageKey` field now contains actual S3 keys of reference images used
- Added debug logging to show which reference images are being stored
- Updated test scripts to remove `uploaded_reference_image_key` parameter

## [1.0] - 2025-06-21

### Added
- **uploadedReferenceImageKey field support** - Added support for optional reference image key in request body
  - Lambda function now accepts `uploaded_reference_image_key` parameter in request body
  - Field is stored in DynamoDB only when provided (optional field)
  - Added debug logging for the new reference image key
  - Maintains backward compatibility - existing requests without this field continue to work

### Changed
- **DynamoDB item structure** - Enhanced to conditionally include `uploadedReferenceImageKey` attribute
- **Request validation** - Updated to handle optional reference image parameter

### Technical Details
- Modified `lambda_handler()` in `src/index.py` to extract and process `uploaded_reference_image_key`
- Updated DynamoDB item creation to conditionally include the new field
- Added appropriate logging for the new field
- No breaking changes - field is completely optional

### Files Modified
- `src/index.py` - Main Lambda handler function
