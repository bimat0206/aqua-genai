# Bedrock Prompt Enhancement Analysis

## Executive Summary

This document analyzes the current Bedrock prompt implementation for Aqua's product verification system and proposes enhancements to improve accuracy, consistency, and edge case handling. The current prompt has good structure but can be enhanced for better precision in product code validation, improved handling of edge cases, and more robust confidence scoring.

## Current Prompt Analysis

### Strengths
1. **Clear Structure**: Well-organized two-phase approach (Label → Overview)
2. **Detailed Instructions**: Comprehensive step-by-step verification process
3. **Category-Specific Features**: Dynamic product features based on category (REF, WM, TV)
4. **Confidence Threshold**: 0.85 minimum confidence requirement
5. **Recent Fix**: Added explicit product code suffix matching requirements

### Areas for Improvement
1. **Product Code Validation**: Could be more systematic and explicit
2. **Edge Case Handling**: Limited guidance for partial occlusion, multiple products, etc.
3. **Consistency**: Some redundancy and potential for misinterpretation
4. **Output Validation**: Could include self-validation checks
5. **Error Recovery**: Limited guidance for ambiguous cases

## Enhanced Prompt Proposal

### Key Enhancements

1. **Structured Product Code Validation Protocol**
2. **Enhanced Edge Case Handling**
3. **Improved Confidence Scoring Logic**
4. **Self-Validation Checks**
5. **Clearer Decision Trees**

---

## BEFORE: Current Prompt Structure

```text
Context: "You are an AI assistant for Aqua, operating as a highly meticulous internal retail display inspector..."

Action: "You will be given the following images in a precise order..."

Phase 1: Label Verification
- Step 1.1: Initial Scan & OCR
- Step 1.2: Feature Extraction (product code, capacity, logos)
- Step 1.3: Reference Comparison
- Step 1.4: Discrepancy Detection
- Step 1.5: Final Judgment
- Step 1.6: Confidence Assessment

Phase 2: Product Overview Verification
- Step 2.1: Initial Product Identification
- Step 2.2: Feature Extraction (category-specific)
- Step 2.3: Reference Comparison
- Step 2.4: Discrepancy Detection
- Step 2.5: Final Judgment
- Step 2.6: Confidence Assessment

Output: JSON with 4 fields
```

### Current Example Response
```json
{
  "matchLabelToReference": "yes",
  "matchLabelToReference_confidence": 0.92,
  "label_explanation": "Exact product code match: AQR-M466XA confirmed on both uploaded label and reference",
  "matchOverviewToReference": "yes", 
  "matchOverviewToReference_confidence": 0.88,
  "overview_explanation": "Product features match reference including door configuration and handle design"
}
```

**Problem**: This response would incorrectly match "AQR-M466XA" with "AQR-M466XA(GB)" reference images.

---

## AFTER: Enhanced Prompt Structure

### Enhanced Context Prompt
```python
@staticmethod
def get_enhanced_context_prompt_text(product_id):
    return f"""
    You are Aqua's AI Product Verification Specialist, designed to perform precise retail compliance audits.
    
    MISSION: Verify that Product ID "{product_id}" is displayed EXACTLY as specified in Aqua's official standards.
    
    CRITICAL PRINCIPLE: This is binary verification - either the product is 100% correct or it is non-compliant. 
    There is no "close enough" - even minor discrepancies indicate non-compliance.
    
    VERIFICATION CONTEXT:
    - Target Product: {product_id}
    - Purpose: Internal compliance audit
    - Standard: Exact match to Aqua's reference materials
    - Tolerance: Zero tolerance for discrepancies in product identification
    """
```

### Enhanced Action Prompt
```python
@staticmethod
def get_enhanced_action_prompt_text(product_id, product_category, max_ref_label_images, max_ref_overview_images):
    specific_product_features = Config.get_specific_product_features(product_category)
    
    return f"""
    VERIFICATION PROTOCOL FOR PRODUCT: {product_id}
    
    IMAGE SEQUENCE:
    1. Uploaded Label Image (retail photo)
    2. Uploaded Overview Image (retail photo) 
    3. {max_ref_label_images} Reference Label Image(s) (official standard)
    4. {max_ref_overview_images} Reference Overview Image(s) (official standard)

    ═══════════════════════════════════════════════════════════════

    PHASE 1: PRODUCT CODE VERIFICATION PROTOCOL

    Step 1A: PRODUCT CODE EXTRACTION
    Extract the complete product model code from the uploaded label image:
    - Read ALL visible text on the label systematically
    - Identify the primary product model code (format: AQR-XXXXXX)
    - Capture ANY suffixes, extensions, or parenthetical codes (e.g., (GB), (SG), (US))
    - Note: Country/region suffixes are INTEGRAL to the product identity

    Step 1B: PRODUCT CODE VALIDATION MATRIX
    Compare extracted code against expected code "{product_id}":
    
    VALIDATION RULES:
    ✓ EXACT MATCH: Extracted code = "{product_id}" character-for-character
    ✗ BASE MATCH ONLY: "AQR-M466XA" ≠ "AQR-M466XA(GB)" (DIFFERENT PRODUCTS)
    ✗ PARTIAL MATCH: Missing characters, extra characters, or substitutions
    ✗ CASE MISMATCH: Different capitalization (unless stylistic only)
    
    DECISION LOGIC:
    - IF exact character match → PROCEED to confidence assessment
    - IF any difference detected → IMMEDIATE FAIL (set matchLabelToReference = "no")
    - IF text unreadable → FAIL due to insufficient data

    Step 1C: SUPPLEMENTARY VERIFICATION
    For EXACT matches, verify supporting elements:
    - Capacity/specifications match reference
    - Logo placement and design consistency
    - Label layout and color scheme alignment
    - Certification marks and regulatory text

    Step 1D: CONFIDENCE CALCULATION
    Base confidence on:
    - Text clarity and readability (0.0-0.3)
    - Lighting and image quality (0.0-0.2) 
    - Complete product code visibility (0.0-0.3)
    - Supporting element verification (0.0-0.2)
    MINIMUM THRESHOLD: 0.85 for positive match

    ═══════════════════════════════════════════════════════════════

    PHASE 2: PHYSICAL PRODUCT VERIFICATION PROTOCOL

    Step 2A: PRIMARY PRODUCT IDENTIFICATION
    Identify the main product in uploaded overview image:
    - Focus on most prominent/central product
    - Ignore secondary products, packaging, or promotional materials
    - Establish clear visual boundaries of target product

    Step 2B: SYSTEMATIC FEATURE EXTRACTION
    For {product_category} products, analyze these critical features:
    {specific_product_features}
    
    EXTRACTION METHOD:
    - Document each feature systematically
    - Note exact colors, finishes, and materials
    - Measure relative proportions and positioning
    - Identify all visible text, logos, and branding

    Step 2C: FEATURE-BY-FEATURE COMPARISON
    Compare each extracted feature against ALL reference images:
    
    COMPARISON MATRIX:
    ✓ IDENTICAL: Feature appears exactly the same across all references
    ? SIMILAR: Minor variation that could be lighting/angle
    ✗ DIFFERENT: Clear distinction in design, color, or configuration
    
    CRITICAL FEATURES (any difference = FAIL):
    - Handle design and placement
    - Door/panel configuration
    - Control interface layout
    - Logo size, position, and styling
    - Color and finish (exact shade matching)

    Step 2D: AGGREGATE DECISION LOGIC
    - IF ALL features identical → PROCEED to confidence assessment
    - IF ANY critical difference → IMMEDIATE FAIL
    - IF image quality prevents verification → FAIL (insufficient data)

    ═══════════════════════════════════════════════════════════════

    ENHANCED OUTPUT PROTOCOL

    CONFIDENCE SCORING MATRIX:
    High Confidence (0.90-1.0): Perfect visibility, clear features, unambiguous match/mismatch
    Medium Confidence (0.85-0.89): Good visibility, identifiable features, clear decision
    Low Confidence (<0.85): Poor visibility, obscured features, ambiguous → DEFAULT TO "no"

    EXPLANATION REQUIREMENTS:
    Label Explanation:
    - Quote exact product code found vs. expected
    - Specify character-by-character comparison result
    - Detail any supplementary verification findings

    Overview Explanation:
    - List each critical feature verification result
    - Specify exact differences if mismatch detected
    - Provide reasoning for confidence score

    SELF-VALIDATION CHECKS:
    Before final output, verify:
    1. Product codes compared character-by-character
    2. All critical features addressed
    3. Confidence scores justified by evidence
    4. Explanations support the yes/no decisions
    5. No contradictions between label and overview results

    REQUIRED JSON OUTPUT:
    {{
        "matchLabelToReference": "yes/no",
        "matchLabelToReference_confidence": 0.00,
        "label_explanation": "[Detailed character-by-character product code analysis and supporting evidence]",
        "matchOverviewToReference": "yes/no", 
        "matchOverviewToReference_confidence": 0.00,
        "overview_explanation": "[Systematic feature-by-feature comparison results]"
    }}

    FINAL VERIFICATION REMINDER:
    Product {product_id} requires EXACT matching. Any deviation, no matter how minor, 
    indicates a different product or non-compliant display.
    """
```

---

## Expected Behavior Changes

### BEFORE: Original Response (Problematic)
**Scenario**: Label shows "AQR-M466XA", Reference is "AQR-M466XA(GB)"

```json
{
  "matchLabelToReference": "yes",
  "matchLabelToReference_confidence": 0.92,
  "label_explanation": "Exact product code match: AQR-M466XA confirmed on both uploaded label and reference",
  "matchOverviewToReference": "yes",
  "matchOverviewToReference_confidence": 0.88,
  "overview_explanation": "Product features match reference including door configuration and handle design"
}
```

### AFTER: Enhanced Response (Correct)
**Scenario**: Label shows "AQR-M466XA", Reference is "AQR-M466XA(GB)"

```json
{
  "matchLabelToReference": "no",
  "matchLabelToReference_confidence": 0.95,
  "label_explanation": "Product code mismatch detected. Extracted code: 'AQR-M466XA' vs Expected: 'AQR-M466XA(GB)'. Missing required suffix '(GB)' indicates different product variant. Character-by-character comparison shows 11-character difference in suffix region.",
  "matchOverviewToReference": "no",
  "matchOverviewToReference_confidence": 0.90,
  "overview_explanation": "Product code mismatch in label verification prevents positive overview match regardless of physical feature similarity. Physical features appear consistent but product identity verification failed."
}
```

---

## Additional Enhancement Examples

### Edge Case 1: Blurry Image
**BEFORE:**
```json
{
  "matchLabelToReference": "no",
  "matchLabelToReference_confidence": 0.60,
  "label_explanation": "Label text is unreadable due to blur"
}
```

**AFTER:**
```json
{
  "matchLabelToReference": "no",
  "matchLabelToReference_confidence": 0.70,
  "label_explanation": "Product code verification failed due to insufficient image quality. Extracted partial text: 'AQR-M4__XA' with middle characters obscured by motion blur. Cannot perform character-by-character validation against AQR-M466XA(GB). Verification requires 100% code visibility for compliance confirmation."
}
```

### Edge Case 2: Multiple Products Visible
**BEFORE:**
```json
{
  "matchOverviewToReference": "yes",
  "matchOverviewToReference_confidence": 0.87,
  "overview_explanation": "Product features match reference including door configuration"
}
```

**AFTER:**
```json
{
  "matchOverviewToReference": "yes", 
  "matchOverviewToReference_confidence": 0.89,
  "overview_explanation": "Target product AQR-M466XA(GB) identified as central/prominent unit (leftmost refrigerator). Systematic feature verification: Door configuration ✓ (French door), Handle design ✓ (recessed integrated), Finish ✓ (stainless steel brushed), Logo placement ✓ (upper right door), Control panel ✓ (internal digital display). Secondary products visible but excluded from analysis per protocol."
}
```

---

## Implementation Benefits

1. **Precision**: Character-by-character product code validation eliminates false positives
2. **Consistency**: Systematic feature extraction reduces subjective interpretation
3. **Traceability**: Detailed explanations provide audit trail for decisions
4. **Robustness**: Enhanced edge case handling improves reliability
5. **Compliance**: Stricter standards ensure regulatory and brand compliance

## Recommended Deployment Strategy

1. **Phase 1**: Implement enhanced product code validation protocol
2. **Phase 2**: Deploy systematic feature extraction methodology  
3. **Phase 3**: Add self-validation checks and enhanced confidence scoring
4. **Phase 4**: Full enhanced prompt deployment with comprehensive testing

## Testing Scenarios

The enhanced prompt should be tested against:
- Exact matches (should pass with high confidence)
- Suffix mismatches (should fail with high confidence) 
- Blurry/obscured images (should fail with appropriate reasoning)
- Multiple products in frame (should identify correct target)
- Similar but different products (should detect subtle differences)
- Edge lighting conditions (should handle appropriately)