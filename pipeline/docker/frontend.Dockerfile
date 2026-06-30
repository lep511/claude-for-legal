FROM public.ecr.aws/lambda/nodejs:22

COPY frontend/package.json frontend/package-lock.json ${LAMBDA_TASK_ROOT}/

RUN npm ci --production=false

COPY frontend/ ${LAMBDA_TASK_ROOT}/

RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080

COPY pipeline/scripts/frontend_handler.mjs ${LAMBDA_TASK_ROOT}/frontend_handler.mjs

CMD ["frontend_handler.handler"]
