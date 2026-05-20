# ==============================================================================
# Multi-stage production build using Bun
# ==============================================================================

# Stage 1: Base & Dependencies
FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Stage 3: Build the application
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
ENV NODE_ENV=production
RUN bun run build

# Stage 4: Production runner
FROM amazon/aws-lambda-nodejs:20 AS release

COPY --from=install /temp/prod/node_modules ${LAMBDA_TASK_ROOT}/node_modules
COPY --from=prerelease /app/dist ${LAMBDA_TASK_ROOT}/dist
COPY --from=prerelease /app/package.json ${LAMBDA_TASK_ROOT}/
COPY --from=prerelease /app/.env* ${LAMBDA_TASK_ROOT}/

CMD ["dist/src/lambda.handler"]
