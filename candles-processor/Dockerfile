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
COPY ./candles-processor/package*.json ./candles-processor/
COPY --from=shared ./usr/app/shared/package.json ./shared/
COPY --from=shared ./usr/app/shared/build/ ./shared/build/
RUN npm ci --only=production --prefix ./candles-processor \
    && npm cache clean --force

FROM node:16.15.1 as build
WORKDIR /usr/app
COPY --from=deps ./usr/app/ .
COPY ./candles-processor/ ./candles-processor/
ENV NODE_ENV production
RUN npm install --include=dev --omit=peer --omit=optional --prefix ./candles-processor \
    && npm cache clean --force \
    && npm run build --prefix ./candles-processor

FROM node:16.15.1

ENV NODE_ENV production

RUN mkdir /usr/app && chown -R node:node /usr/app

USER node
WORKDIR /usr/app

COPY --chown=node:node --from=deps ./usr/app/shared/ ./shared/
COPY --chown=node:node --from=shared-deps ./usr/app/shared/node_modules ./shared/node_modules
COPY --chown=node:node --from=deps ./usr/app/candles-processor ./candles-processor/
COPY --chown=node:node --from=build ./usr/app/candles-processor/build/ ./candles-processor/build/

CMD [ "node", "./candles-processor/build/index.js" ]
