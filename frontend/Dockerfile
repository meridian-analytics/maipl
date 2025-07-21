# build
FROM node:20-alpine as build
WORKDIR /build

# Install pnpm directly
RUN npm install -g pnpm@9.0.1

# git
RUN apk add git

# Set build argument for environment
ARG NODE_ENV=staging

# First copy scripts and env files
COPY scripts/ ./scripts/
COPY .env/ ./.env/
RUN chmod +x scripts/setup-env.sh

# dependencies
COPY package.json package.json
COPY pnpm-lock.yaml pnpm-lock.yaml
COPY pnpm-workspace.yaml pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

# Copy source files
COPY apps/ ./apps/
COPY modules/ ./modules/

# Run environment setup
RUN ./scripts/setup-env.sh ${NODE_ENV}

RUN pnpm --recursive install
RUN pnpm @build

# deploy
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/nginx.conf
COPY --from=build /build/apps/annotation-tool/dist /usr/share/nginx/html/annotation-tool
COPY --from=build /build/apps/authentication-service/dist /usr/share/nginx/html/authentication-service
COPY --from=build /build/apps/file-service/dist /usr/share/nginx/html/file-service
COPY --from=build /build/apps/metrics/dist /usr/share/nginx/html/metrics
COPY --from=build /build/apps/model-runner/dist /usr/share/nginx/html/model-runner
COPY --from=build /build/apps/model-trainer/dist /usr/share/nginx/html/model-trainer
COPY --from=build /build/apps/database-tool/dist /usr/share/nginx/html/database-tool