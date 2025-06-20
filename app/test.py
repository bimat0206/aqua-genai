import boto3
import os
import requests
import json

def get_smallest_image_key(bucket_name, prefix, aws_profile=None):
    """
    Lists objects in an S3 prefix and returns the key of the smallest image.
    Uses a specified AWS profile for credentials.
    """
    if aws_profile:
        session = boto3.Session(profile_name=aws_profile)
        s3_client = session.client('s3')
    else:
        s3_client = boto3.client('s3')

    smallest_size = float('inf')
    smallest_image_key = None

    paginator = s3_client.get_paginator('list_objects_v2')
    pages = paginator.paginate(Bucket=bucket_name, Prefix=prefix)

    for page in pages:
        if "Contents" in page:
            for obj in page['Contents']:
                if obj['Key'].lower().endswith(('.png', '.jpg', '.jpeg')):
                    if obj['Size'] < smallest_size:
                        smallest_size = obj['Size']
                        smallest_image_key = obj['Key']
    return smallest_image_key

def get_product_identifiers_from_s3(bucket_name, aws_profile=None):
    """
    Scans the S3 bucket to identify product categories and product IDs.
    Assumes the pattern: dataset/$PRODUCT_CATEGORY/$PRODUCT_ID/
    """
    if aws_profile:
        session = boto3.Session(profile_name=aws_profile)
        s3_client = session.client('s3')
    else:
        s3_client = boto3.client('s3')

    product_identifiers = []
    paginator = s3_client.get_paginator('list_objects_v2')

    category_pages = paginator.paginate(Bucket=bucket_name, Prefix="dataset/", Delimiter='/')
    for page in category_pages:
        if "CommonPrefixes" in page:
            for category_prefix_data in page['CommonPrefixes']:
                category_prefix = category_prefix_data['Prefix']
                product_category = category_prefix.replace("dataset/", "").replace("/", "")

                product_id_pages = paginator.paginate(Bucket=bucket_name, Prefix=category_prefix, Delimiter='/')
                for product_id_page in product_id_pages:
                    if "CommonPrefixes" in product_id_page:
                        for product_id_prefix_data in product_id_page['CommonPrefixes']:
                            product_id_prefix = product_id_prefix_data['Prefix']
                            parts = product_id_prefix.split('/')
                            if len(parts) >= 3 and parts[0] == 'dataset' and parts[2] != '':
                                product_id = parts[2]
                                if product_id and product_id not in ["TEM NL", "CHÍNH DIỆN"]:
                                    product_identifiers.append({
                                        'PRODUCT_ID': product_id,
                                        'PRODUCT_CATEGORY': product_category
                                    })
    unique_product_identifiers = []
    seen = set()
    for p in product_identifiers:
        identifier_tuple = (p['PRODUCT_ID'], p['PRODUCT_CATEGORY'])
        if identifier_tuple not in seen:
            unique_product_identifiers.append(p)
            seen.add(identifier_tuple)
            
    return unique_product_identifiers

def main():
    AWS_BUCKET_NAME = 'aqua-genai-dataset-879654127886-ap-southeast-1'
    API_GATEWAY_ENDPOINT = 'https://z6qfarsb1e.execute-api.ap-southeast-1.amazonaws.com/dev/validate'
    API_KEY = 'ouccdzWHjR8w1E54Ys6Jf4PYgItAOCi42ehrz1F3'
    AWS_PROFILE = 'renovalab'
    OUTPUT_FILENAME = 'result.json'

    if not API_GATEWAY_ENDPOINT or not API_KEY or not AWS_BUCKET_NAME:
        print("Error: AWS_BUCKET_NAME, API_GATEWAY_ENDPOINT, and API_KEY are required configurations.")
        return

    print("Fetching product data from S3 bucket...")
    product_data_from_s3 = get_product_identifiers_from_s3(AWS_BUCKET_NAME, AWS_PROFILE)

    if not product_data_from_s3:
        print(f"No product data found in S3 bucket: {AWS_BUCKET_NAME}")
        return

    print(f"Found {len(product_data_from_s3)} products in S3.")

    all_api_responses = []

    for data in product_data_from_s3:
        product_id = data['PRODUCT_ID']
        product_category = data['PRODUCT_CATEGORY']

        overview_prefix = f"dataset/{product_category}/{product_id}/CHÍNH DIỆN/"
        label_prefix = f"dataset/{product_category}/{product_id}/TEM NL/"

        print(f"\nProcessing product: {product_id}, Category: {product_category}")

        overview_image_key = get_smallest_image_key(AWS_BUCKET_NAME, overview_prefix, AWS_PROFILE)
        if overview_image_key:
            print(f"  Smallest OVERVIEW image for {product_id}: {overview_image_key}")
        else:
            print(f"  No OVERVIEW images found for {product_id} under prefix: {overview_prefix}")

        label_image_key = get_smallest_image_key(AWS_BUCKET_NAME, label_prefix, AWS_PROFILE)
        if label_image_key:
            print(f"  Smallest LABEL image for {product_id}: {label_image_key}")
        else:
            print(f"  No LABEL images found for {product_id} under prefix: {label_prefix}")

        if overview_image_key and label_image_key:
            headers = {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            }
            payload = {
                "product_id": product_id,
                "product_category": product_category,
                "uploaded_label_image_key": label_image_key,
                "uploaded_overview_image_key": overview_image_key
            }

            print(f"\nSending API Gateway request for {product_id}...")
            try:
                response = requests.post(API_GATEWAY_ENDPOINT, headers=headers, json=payload)
                print(f"API Gateway Response Status: {response.status_code}")
                try:
                    response_json = {
                        "payload": payload,
                        "response": response.json()
                    }
                    all_api_responses.append(response_json) # Append the JSON response
                    print(f"API Gateway Response Body: {json.dumps(response_json, indent=2)}")
                except json.JSONDecodeError:
                    print(f"API Gateway Response Body (non-JSON): {response.text}")

            except requests.exceptions.RequestException as e:
                print(f"Error sending request to API Gateway: {e}")
        else:
            print(f"  Skipping API Gateway request for {product_id} due to missing image keys.")
        print("-" * 50)

    if all_api_responses:
        try:
            with open(OUTPUT_FILENAME, 'w', encoding='utf-8') as f:
                json.dump(all_api_responses, f, ensure_ascii=False, indent=4)
            print(f"\nSuccessfully exported API responses to {OUTPUT_FILENAME}")
        except IOError as e:
            print(f"Error writing to file {OUTPUT_FILENAME}: {e}")
    else:
        print("\nNo API responses were collected to export.")

if __name__ == "__main__":
    main()

    # AWS_BUCKET_NAME = 'aqua-genai-dataset-879654127886-ap-southeast-1'
    # API_GATEWAY_ENDPOINT = 'https://z6qfarsb1e.execute-api.ap-southeast-1.amazonaws.com/dev/validate'
    # API_KEY = 'ouccdzWHjR8w1E54Ys6Jf4PYgItAOCi42ehrz1F3'
    # AWS_PROFILE = 'renovalab'
