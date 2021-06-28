FROM node:lts-alpine@sha256:21b87afa5f267e50b806f696f754b15b37b4118bb0ef722192f27ddff78d8d67 as build-container
RUN apk add --no-cache --update bluez python build-base

WORKDIR "/app"

COPY package*.json "/app/"
RUN npm ci

COPY . "/app/"
RUN npm run build && \
    rm -rf ./.github ./src ./test ./node_modules


FROM node:lts-alpine@sha256:21b87afa5f267e50b806f696f754b15b37b4118bb0ef722192f27ddff78d8d67
RUN apk add --no-cache --update bluez python build-base

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
WORKDIR "/app"

RUN apk add --no-cache --update dumb-init && \
    ln -s /app/dist/bin/ble2mqtt.cjs /usr/local/bin/ble2mqtt

COPY --from=build-container /app/package*.json "/app/"
RUN npm ci --only-production

COPY --from=build-container "/app" "/app"
USER node

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/usr/local/bin/ble2mqtt"]
