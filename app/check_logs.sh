#!/bin/bash

# Script to check Lambda logs for errors

# Set variables
LAMBDA_NAME="aqua-genai-validate-function-ncwy"
REGION="ap-southeast-1"
LOG_GROUP="/aws/lambda/$LAMBDA_NAME"

# Get the most recent log stream
echo "Getting the most recent log stream..."
LATEST_STREAM=$(aws logs describe-log-streams \
  --log-group-name "$LOG_GROUP" \
  --order-by LastEventTime \
  --descending \
  --limit 1 \
  --region "$REGION" \
  --query 'logStreams[0].logStreamName' \
  --output text)

if [ -z "$LATEST_STREAM" ] || [ "$LATEST_STREAM" == "None" ]; then
  echo "No log streams found for $LOG_GROUP"
  exit 1
fi

echo "Latest log stream: $LATEST_STREAM"

# Get the most recent error events
echo "\nFetching recent error logs..."
aws logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  --log-stream-names "$LATEST_STREAM" \
  --filter-pattern "ERROR" \
  --region "$REGION" \
  --limit 10 \
  --query 'events[*].message' \
  --output text

# Get the most recent events (regardless of error status)
echo "\nFetching most recent logs (last 10 events)..."
aws logs get-log-events \
  --log-group-name "$LOG_GROUP" \
  --log-stream-name "$LATEST_STREAM" \
  --limit 10 \
  --region "$REGION" \
  --query 'events[*].message' \
  --output text