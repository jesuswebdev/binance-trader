FROM node:16.15.1 AS shared
WORKDIR /usr/app
COPY ./shared ./shared/
ENV NODE_ENV=production
RUN npm install --include=dev --prefix ./shared \
    && npm run build --prefix ./shared \
    && npm cache clean --force 

FROM node:16.15.1 AS shared-deps
WORKDIR /usr/app
COPY --from=shared ./usr/app/shared/package*.json ./shared/
RUN npm ci --only=production --prefix ./shared \
    && npm cache clean --force

FROM node:16.15.1 AS deps
WORKDIR /usr/app
COPY ./markets-observer/package*.json ./markets-observer/
COPY --from=shared ./usr/app/shared/package.json ./shared/
COPY --from=shared  ./usr/app/shared/build/ ./shared/build/
RUN npm ci --only=production --prefix ./markets-observer \
    && npm cache clean --force

FROM node:16.15.1 AS build
WORKDIR /usr/app
COPY --from=deps ./usr/app/ .
COPY ./markets-observer/ ./markets-observer/

RUN npm install --include=dev --omit=peer --omit=optional --prefix ./markets-observer \
    && npm cache clean --force \
    && npm run build --prefix ./markets-observer

FROM node:16.15.1

ENV NODE_ENV=production

RUN mkdir /usr/app && chown -R node:node /usr/app

USER node
WORKDIR /usr/app

COPY --chown=node:node --from=deps ./usr/app/shared/ ./shared/
COPY --chown=node:node --from=shared-deps ./usr/app/shared/node_modules ./shared/node_modules
COPY --chown=node:node --from=deps ./usr/app/markets-observer/ ./markets-observer/
COPY --chown=node:node --from=build ./usr/app/markets-observer/build/ ./markets-observer/build/

CMD [ "node", "./markets-observer/build/index.js" ]
