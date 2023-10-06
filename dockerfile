# Dockerfile in project's root
# Step 1: Build phase
FROM node:16 as build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY modules ./modules
COPY apps ./apps
RUN npm install --global pnpm
RUN pnpm -r install
RUN pnpm run @build

# Step 2: Setup nginx for each service
FROM nginx:alpine

COPY --from=build /app/apps/annotation-tool/dist /usr/share/nginx/html/annotation-tool
COPY --from=build /app/apps/authentication-service/dist /usr/share/nginx/html/authentication-service
COPY --from=build /app/apps/file-service/dist /usr/share/nginx/html/file-service
COPY --from=build /app/apps/model-runner/dist /usr/share/nginx/html/model-runner


COPY apps/annotation-tool/nginx/nginx.conf /etc/nginx/conf.d/annotation-tool.conf
COPY apps/authentication-service/nginx/nginx.conf /etc/nginx/conf.d/authentication-service.conf
COPY apps/file-service/nginx/nginx.conf /etc/nginx/conf.d/file-service.conf
COPY apps/model-runner/nginx/nginx.conf /etc/nginx/conf.d/model-runner.conf
