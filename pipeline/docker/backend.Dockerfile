FROM public.ecr.aws/lambda/python:3.13

COPY pyproject.toml uv.lock ${LAMBDA_TASK_ROOT}/

RUN pip install uv && uv pip install --system --no-cache -r ${LAMBDA_TASK_ROOT}/pyproject.toml

COPY api_server.py api_handlers.py session_manager.py profile_manager.py skill_runner.py main.py ${LAMBDA_TASK_ROOT}/
COPY agents/ ${LAMBDA_TASK_ROOT}/agents/
COPY sdk_tools/ ${LAMBDA_TASK_ROOT}/sdk_tools/
COPY mcp_servers/ ${LAMBDA_TASK_ROOT}/mcp_servers/
COPY templates/ ${LAMBDA_TASK_ROOT}/templates/
COPY references/ ${LAMBDA_TASK_ROOT}/references/

COPY pipeline/scripts/lambda_handler.py ${LAMBDA_TASK_ROOT}/lambda_handler.py

CMD ["lambda_handler.handler"]
