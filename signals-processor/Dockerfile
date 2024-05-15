FROM node:16.15.1 as shared
WORKDIR /usr/app
COPY ./shared ./shared/
ENV NODE_ENV production
RUN npm install --include=dev --prefix ./shared \
    && npm run build --prefix ./shared \
    && npm cache clean --force 

FROM node:16.15.1 as shared-deps
WORKDIR /usr/app
COPY --from=shared ./usr/app/shared/package*.json ./shared/
RUN npm ci --only=production --prefix ./shared \
    && npm cache clean --force

FROM node:16.15.1 as deps
WORKDIR /usr/app
COPY ./signals-processor/package*.json ./signals-processor/
COPY --from=shared ./usr/app/shared/package.json ./shared/
COPY --from=shared ./usr/app/shared/build/ ./shared/build/
RUN npm ci --only=production --prefix ./signals-processor \
    && npm cache clean --force

FROM node:16.15.1 as build
WORKDIR /usr/app
COPY --from=deps ./usr/app/ .
COPY ./signals-processor/ ./signals-processor/

RUN npm install --include=dev --omit=peer --omit=optional --prefix ./signals-processor \
    && npm cache clean --force \
    && npm run build --prefix ./signals-processor

FROM node:16.15.1

ENV NODE_ENV production

RUN mkdir /usr/app && chown -R node:node /usr/app

USER node
WORKDIR /usr/app

COPY --chown=node:node --from=deps ./usr/app/shared/ ./shared/
COPY --chown=node:node --from=shared-deps ./usr/app/shared/node_modules ./shared/node_modules
COPY --chown=node:node --from=deps ./usr/app/signals-processor ./signals-processor/
COPY --chown=node:node --from=build ./usr/app/signals-processor/build/ ./signals-processor/build/

CMD [ "node", "./signals-processor/build/index.js" ]
