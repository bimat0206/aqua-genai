import os

class Config:
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
    
    # Bedrock
    AWS_MODEL_ID = os.environ.get("AWS_MODEL_ID")
    AWS_MODEL_REGION = os.environ.get("AWS_MODEL_REGION")
    AWS_MODEL_MAX_TOKENS = int(os.environ.get("AWS_MODEL_MAX_TOKENS"))
    AWS_MODEL_TEMPERATURE = float(os.environ.get("AWS_MODEL_TEMPERATURE"))
    
    # S3
    AWS_DATASET_BUCKET = os.environ.get("AWS_DATASET_BUCKET")
    AWS_IMPUT_IMG_VALIDATION_BUCKET = os.environ.get("AWS_IMPUT_IMG_VALIDATION_BUCKET")

    # DynamoDB
    AWS_RESULT_TABLE = os.environ.get("AWS_RESULT_TABLE")

    # Lambda
    MAX_REFERENCE_LABEL_IMAGES = int(os.environ.get("MAX_REFERENCE_LABEL_IMAGES"))
    MAX_REFERENCE_OVERVIEW_IMAGES = int(os.environ.get("MAX_REFERENCE_OVERVIEW_IMAGES"))

    PRODUCT_FEATURES_MAP = {
        "REF": """
            * **Door Configuration:** A two-door bottom-freezer refrigerator. Specifically note if it's a French door, side-by-side, or a specific top-freezer/bottom-freezer configuration.**
            * **Handle Design:** Describe the exact handle style (e.g., integrated pocket handles, long vertical bar handles, specific recessed shape).
            * **Exterior Finish & Color:** Precise color (e.g., "Glossy Dark Grey," "Matte Black," "Brushed Stainless Steel"). Note any distinctive textures or patterns.
            * **Logo/Branding Placement:** Exact location and appearance of the Aqua logo.**
            * **Control Panel/Display (if visible):** Location, type (touch, dial), and design of any external display or controls.**
            * **Ventilation/Grilles (if prominent):** Location and design of any visible vents or grilles that are part of the main design.
            * **Dimensions/Proportions (relative):** General visual proportion of the doors, body, etc.
        """,
        "WM": """
            * **Loading Type:** Clearly distinguish between front-load and top-load designs.
            * **Door/Lid Design:** Material (tempered glass, solid), hinge type, and latch mechanism. For top-loaders, note if it's a soft-close lid.
            * **Control Panel:** Layout, type of controls (knobs, touch screen, buttons), and digital display design.
            * **Detergent Dispenser:** Location, design, and number of compartments (liquid, powder, fabric softener).
            * **Drum & Agitator (for top-loaders):** Presence/absence and design of a central agitator or the impeller shape. For front-loaders, observe the drum opening, gasket, and internal drum texture.
            * **Exterior Features:** Presence of pedestals, pull-out drawers, or additional storage compartments.
        """,
        "TV": """
            * **Screen & Bezel:** Bezel thickness, color, and design (e.g., razor-thin, slightly thicker bottom bezel, specific corner design), screen reflectivity (matte vs. glossy).
            * **Stand Design:** Type and shape of the stand (e.g., central pedestal, dual feet at ends, specific V-shape, T-shape).
            * **Port Locations & Layout:** Visible arrangement of HDMI, USB, or other input/output ports (if observable from the front/side).
            * **Speaker Grilles:** Location and design of any visible speaker grilles or integrated soundbar appearance.
            * **Manufacturer Logos & Model Text:** Exact placement, font, and finish of manufacturer logos, and legibility/presence of model number text on the unit itself.
            * **Remote/Control Buttons:** Visible buttons on the TV frame, if any.
        """,
        "OTHER": """
            * **General Design Elements:** Any unique buttons, indicator lights (color, shape, placement), overall texture (smooth, ribbed, matte), color scheme, distinct trim pieces, or subtle design curves and angles that differentiate the product.
            * **Component Layout:** How different parts of the product are arranged and integrated.
        """
    }

    @classmethod
    def get_specific_product_features(cls, product_category):
        return cls.PRODUCT_FEATURES_MAP.get(product_category.upper(), cls.PRODUCT_FEATURES_MAP["OTHER"]).strip()

    @staticmethod
    def get_context_prompt_text(product_id):
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

    @staticmethod
    def get_action_prompt_text(product_id, product_category, max_ref_label_images, max_ref_overview_images):
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
