FROM public.ecr.aws/lambda/python:3.9

# Copy requirements.txt
COPY requirements.txt ${LAMBDA_TASK_ROOT}/

# Install the dependencies
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Copy source code
COPY src/ ${LAMBDA_TASK_ROOT}/

# Set the CMD to your handler
CMD ["index.lambda_handler"]