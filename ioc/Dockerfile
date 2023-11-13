FROM node:18-alpine as build
ARG NPM_TOKEN
RUN test -n "$NPM_TOKEN" || (echo "Required build arg 'npm_token' not set" && false)
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
RUN npm config set //registry.npmjs.org/:_authToken ${NPM_TOKEN}
RUN npm ci
COPY src /app/src
COPY tsconfig.json /app/tsconfig.json
RUN npm run build && npm prune --omit=dev

FROM alpine:3.18
RUN apk add --no-cache nodejs
COPY --from=build /app/dist /app
COPY --from=build /app/node_modules /app/node_modules
CMD ["node", "/app"]
