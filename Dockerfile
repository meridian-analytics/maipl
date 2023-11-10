# build
FROM node:18 as build
WORKDIR /build
COPY apps apps
COPY modules modules
COPY package.json package.json
COPY pnpm-lock.yaml pnpm-lock.yaml
COPY pnpm-workspace.yaml pnpm-workspace.yaml
COPY tsconfig.json tsconfig.json

# pnpm
RUN corepack enable
RUN corepack prepare pnpm@latest --activate
RUN pnpm i --recursive
RUN pnpm run @build

# deploy
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/nginx.conf
COPY --from=build /build/apps/annotation-tool/dist /usr/share/nginx/html/annotation-tool
COPY --from=build /build/apps/authentication-service/dist /usr/share/nginx/html/authentication-service
COPY --from=build /build/apps/file-service/dist /usr/share/nginx/html/file-service
COPY --from=build /build/apps/model-runner/dist /usr/share/nginx/html/model-runner
