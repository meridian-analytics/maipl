# Dockerfile in project's root
# Step 1: Build phase
FROM node:16 as build
WORKDIR /app
COPY . .
RUN npm install --global pnpm
RUN pnpm -r install
RUN pnpm run @build

# Step 2: Setup nginx for each service
FROM nginx:alpine

COPY --from=build /app/apps/annotation-tool/dist /usr/share/nginx/html/annotation-tool
COPY --from=build /app/apps/authentication-service/dist /usr/share/nginx/html/authentication-service
COPY --from=build /app/apps/file-service/dist /usr/share/nginx/html/file-service
COPY --from=build /app/apps/model-runner/dist /usr/share/nginx/html/model-runner

# Copy nginx configuration from /nginx to default nginx configuration directory

COPY /nginx/. /etc/nginx/conf.d/.
