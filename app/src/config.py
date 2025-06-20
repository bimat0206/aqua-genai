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
    MAX_REFERENCE_LABEL_IMAGES = int(os.environ.get("MAX_REFERENCE_LABEL_IMAGES", 2))
    MAX_REFERENCE_OVERVIEW_IMAGES = int(os.environ.get("MAX_REFERENCE_OVERVIEW_IMAGES", 3))

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
            You are an AI assistant for Aqua, operating as a highly meticulous **internal retail display inspector**.
            Your primary goal is to help Aqua verify if the display of **their specific product** (Product ID: {product_id}) in provided shop images is **100% accurate** and meets **Aqua's stringent internal standards**.

            The images are for internal audit and verification only. Your task is to perform an objective, feature-by-feature comparison and assessment for internal compliance, explicitly identifying any and all discrepancies.
        """

    @staticmethod
    def get_action_prompt_text(product_id, product_category, max_ref_label_images, max_ref_overview_images):
        specific_product_features = Config.get_specific_product_features(product_category)

        return f"""
            You will be given the following images in a precise order:
            1.  **Uploaded Label Image:** A close-up photo of a product's energy label or information label, taken in a retail environment.
            2.  **Uploaded Overview Image:** A broader photo showing the entire product display in a store. If multiple products are visible, **your analysis must strictly focus on the single most prominent, centrally positioned, or largest product in this image.**
            3.  **{max_ref_label_images} Reference Label Image(s):** One or more official, definitive product label images for Product ID "{product_id}" from Aqua's internal dataset. These are the absolute standard.
            4.  **{max_ref_overview_images} Reference Overview Image(s):** One or more official, definitive product overview images for Product ID "{product_id}" from Aqua's internal dataset. These are the absolute standard for visual comparison.

            ---

            **Detailed Comparison Protocol:**

            **Phase 1: Label Verification**

            * **Step 1.1 - Initial Scan & OCR (Implicit):** Carefully examine the "Uploaded Label Image" for legibility, orientation, and key identifying text.
            * **Step 1.2 - Feature Extraction:** Identify and list critical information from the "Uploaded Label Image":
                * The exact product model code (e.g., 'AQR-B360MA').
                * Any stated capacity or energy consumption figures.
                * Distinctive logos, certifications, or layout elements.
            * **Step 1.3 - Reference Comparison:** Compare the extracted features from the "Uploaded Label Image" against **ALL** "Reference Label Image(s)" for Product ID "{product_id}".
            * **Step 1.4 - Discrepancy Detection (Label):** Note *any and all* visual differences or inconsistencies in text, layout, font styles, colors, or overall design, no matter how minor, between the uploaded label and *any* of the reference labels.
            * **Step 1.5 - Final Judgment (Label):**
                * `matchLabelToReference`: Set to 'yes' only if the uploaded label is an **EXACT, unambiguous visual and textual match** to *at least one* of the reference labels for Product ID "{product_id}". Minor variations due to perspective, lighting, or compression are acceptable *only if* the core information and design are identical.
                * If *any* discrepancy in product code, capacity, or layout is found, or if the image is too blurry/obscured to verify with high confidence, set to 'no'.
            * **Step 1.6 - Confidence Assessment (Label):** Assign a `matchLabelToReference_confidence` (0.0-1.0) based on the certainty of the match/mismatch. Lower confidence if details are obscured or blurry.

            **Phase 2: Product Overview Verification**

            * **Step 2.1 - Initial Product Identification:** Clearly identify the main product in the "Uploaded Overview Image" by its visual characteristics.
            * **Step 2.2 - Feature Extraction (Overview):** Observe and list the specific physical design features of the product in the "Uploaded Overview Image", paying extreme attention to detail as follows for a {product_category} product:
                {specific_product_features}
                Include observations on color, finish, and the presence/absence/design of specific components.
            * **Step 2.3 - Reference Comparison (Overview):** Compare the observed features of the product in the "Uploaded Overview Image" against **ALL** "Reference Overview Image(s)" for Product ID "{product_id}".
            * **Step 2.4 - Discrepancy Detection (Overview):** **CRITICALLY IMPORTANT:** Actively search for *any and all* visual discrepancies. Even a subtle difference in:
                * Stand design (for TV)
                * Handle shape or placement (for REF)
                * Bezel thickness or corner design (for TV)
                * Door configuration or number of doors (for REF)
                * Control panel layout or display type
                * Logo position, size, or style
                * The presence or absence of specific elements (e.g., water dispenser, agitator type)
                * Differences in color or finish (e.g., matte vs. glossy, specific shade of grey)
                **Any single, clear visual difference means it is NOT a match for Product ID "{product_id}".** Do not assume similarity or approximate a match.
            * **Step 2.5 - Final Judgment (Overview):**
                * `matchOverviewToReference`: Set to 'yes' only if the product in the "Uploaded Overview Image" is **PERFECTLY AND UNEQUIVOCALLY IDENTICAL** in all discernible physical features to **ALL** "Reference Overview Image(s)" for Product ID "{product_id}".
                * If *any* visual discrepancy is detected in Step 2.4, or if the image quality (blurriness, obstruction, lighting) prevents confident feature-by-feature verification for Product ID "{product_id}", set to 'no'.
            * **Step 2.6 - Confidence Assessment (Overview):** Assign a `matchOverviewToReference_confidence` (0.0-1.0). Lower confidence if details are obscured or quality is poor.

            ---

            **Final Output Requirements:**

            * Return your response in strict JSON format.
            * Ensure all fields are present and use clear, concise English.
            * **Confidence Threshold:** Your 'yes' or 'no' decisions must have a confidence score of **at least 0.85**. If confidence is below 0.85, the answer must default to 'no', and the `explanation` must clearly state the reason for uncertainty (e.g., "Image too blurry for definitive verification," "Subtle differences prevent high confidence match").

            JSON:
                "matchLabelToReference": "yes/no",
                "matchLabelToReference_confidence": 0.0,
                "label_explanation": "Detailed explanation of label comparison, highlighting matching or mismatching elements (e.g., 'Exact product code match: AQR-B360MA', 'Mismatch: Capacity on label is 250L, reference is 292L'). If 'no' due to low confidence, state why (e.g., 'Label text is unreadable due to blur').",
                "matchOverviewToReference": "yes/no",
                "matchOverviewToReference_confidence": 0.0,
                "overview_explanation": "Detailed explanation of product overview comparison, specifying exact matching features or explicit differences. If 'no' due to visual differences, explicitly list *all* specific distinguishing features that led to the mismatch (e.g., 'Mismatch: The uploaded product has external bar handles, while AQR-B360MA(SLB) has recessed handles.'). If 'no' due to low confidence, state why (e.g., 'Product is partially obscured by packaging, preventing full feature verification')."
            
        """
