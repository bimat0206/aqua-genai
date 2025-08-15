# Changelog - Aqua GenAI Lambda App

All notable changes to the Lambda verification function will be documented in this file.

## [1.3.0] - 2025-06-25

### Added
- **Enhanced Verification Protocol** - Complete overhaul of Bedrock prompt system for improved accuracy and consistency
  - Implemented systematic two-phase verification protocol (Product Code → Physical Features)
  - Added character-by-character product code validation matrix with explicit rules
  - Enhanced confidence scoring methodology with granular criteria
  - Introduced self-validation checks before output generation
  - Added structured decision logic with clear fail conditions

### Enhanced
- **Product Code Validation** - Comprehensive character-by-character matching system
  - Validation rules explicitly define exact match requirements
  - Clear decision logic: EXACT MATCH vs BASE MATCH vs PARTIAL MATCH vs CASE MISMATCH
  - Immediate fail conditions for any character discrepancies
  - Enhanced handling of country/region suffixes like (GB), (SG), (US)
- **Physical Feature Verification** - Systematic feature extraction and comparison
  - Feature-by-feature comparison matrix (IDENTICAL vs SIMILAR vs DIFFERENT)
  - Critical feature identification with automatic fail conditions
  - Enhanced color and finish matching requirements
  - Improved handling of multiple products in frame
- **Confidence Scoring** - Granular confidence calculation methodology
  - High Confidence (0.90-1.0): Perfect visibility and unambiguous results
  - Medium Confidence (0.85-0.89): Good visibility with clear decisions
  - Low Confidence (<0.85): Automatic default to "no" with detailed reasoning
- **Output Quality** - Enhanced explanation requirements and validation
  - Detailed character-by-character analysis in explanations
  - Systematic feature verification reporting
  - Self-validation checks ensure consistency between decisions and explanations

### Technical Details
- Completely rewrote `get_context_prompt_text()` with enhanced mission and principles
- Replaced `get_action_prompt_text()` with systematic verification protocol
- Added visual separators and structured formatting for improved AI comprehension
- Enhanced validation matrices and decision trees for consistent results
- Implemented comprehensive confidence scoring methodology
- Added self-validation checks to prevent contradictory outputs

### Files Modified
- `src/config.py` - Complete prompt system overhaul with enhanced verification protocols

## [1.2.1] - 2025-06-25

### Fixed
- **Product Code Suffix Matching** - Fixed issue where product codes with country suffixes were incorrectly matched
  - Bedrock AI model now enforces strict character-for-character matching of product codes including suffixes
  - Product codes like "AQR-M466XA" and "AQR-M466XA(GB)" are now correctly identified as different products
  - Enhanced prompt instructions to explicitly handle parenthetical suffixes like (GB), (SG), etc.
  - Improved error detection for missing or incorrect product code suffixes

### Technical Details
- Modified `config.py` prompt instructions to emphasize exact product code matching
- Added explicit examples showing suffix matching requirements
- Updated label comparison logic to treat suffixes as integral parts of product codes
- Enhanced explanation field examples to show proper suffix mismatch reporting

### Files Modified
- `src/config.py` - Updated Bedrock prompt configuration for strict product code matching

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
