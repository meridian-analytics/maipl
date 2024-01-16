# build
FROM node:20-alpine as build
WORKDIR /build

# pnpm
RUN corepack enable

# git
RUN apk add git

# dependencies
COPY package.json package.json
COPY pnpm-lock.yaml pnpm-lock.yaml
COPY pnpm-workspace.yaml pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

# build
COPY apps apps
COPY modules modules
COPY tsconfig.json tsconfig.json
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
