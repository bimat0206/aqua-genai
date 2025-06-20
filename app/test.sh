export API_GATEWAY_ENDPOINT="https://p54uxywt9c.execute-api.ap-southeast-1.amazonaws.com/dev/validate"
export API_KEY="5vBzBEoyZv2TgVkFFRsng92wCp4TRWtQ5qZOOPry"

export PRODUCT_ID='AQR-M466XA(GB)'
export PRODUCT_CATEGORY='REF'
export LABEL_IMAGE_KEY="dataset/$PRODUCT_CATEGORY/$PRODUCT_ID/TEM NL/22ab3ab6-ed75-4999-b3dc-1b7aaf9cb070-image_1731580040127.jpg"
export OVERVIEW_IMAGE_KEY="dataset/$PRODUCT_CATEGORY/$PRODUCT_ID/CHÍNH DIỆN/20ffd946-63eb-4b55-95a8-790e358c5d00-image_1731580061456.jpg"

curl -X POST \
  "$API_GATEWAY_ENDPOINT" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -d "{
    \"product_id\": \"$PRODUCT_ID\",
    \"product_category\": \"$PRODUCT_CATEGORY\",
    \"uploaded_label_image_key\": \"$LABEL_IMAGE_KEY\",
    \"uploaded_overview_image_key\": \"$OVERVIEW_IMAGE_KEY\"
  }"
