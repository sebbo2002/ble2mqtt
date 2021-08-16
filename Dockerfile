FROM node:lts-alpine@sha256:b8d48b515e3049d4b7e9ced6cedbe223c3bc4a3d0fd02332448f3cdb000faee1 as build-container
RUN apk add --no-cache --update bluez python build-base

WORKDIR "/app"

COPY package*.json "/app/"
RUN npm i -g npm && \
    npm ci

COPY . "/app/"
RUN npm run build && \
    rm -rf ./.github ./src ./test ./node_modules


FROM node:lts-alpine@sha256:b8d48b515e3049d4b7e9ced6cedbe223c3bc4a3d0fd02332448f3cdb000faee1
RUN apk add --no-cache --update bluez python build-base

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
WORKDIR "/app"

RUN apk add --no-cache --update dumb-init && \
    ln -s /app/dist/bin/ble2mqtt.cjs /usr/local/bin/ble2mqtt

COPY --from=build-container /app/package*.json "/app/"
RUN npm i -g npm && \
    npm ci --only-production

COPY --from=build-container "/app" "/app"
USER node

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/usr/local/bin/ble2mqtt"]
