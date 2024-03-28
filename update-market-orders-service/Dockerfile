FROM node:20.12 as shared
WORKDIR /usr/app
COPY ./shared ./shared/
ENV NODE_ENV production
RUN npm install --include=dev --prefix ./shared \
    && npm run build --prefix ./shared \
    && npm cache clean --force
    
FROM node:20.12 as shared-deps
WORKDIR /usr/app
COPY --from=shared ./usr/app/shared/package*.json ./shared/
RUN npm ci --only=production --prefix ./shared \
    && npm cache clean --force

FROM node:20.12 as deps
WORKDIR /usr/app
COPY ./update-market-orders-service/package*.json ./update-market-orders-service/
COPY --from=shared ./usr/app/shared/package.json ./shared/
COPY --from=shared ./usr/app/shared/build/ ./shared/build/
RUN npm ci --only=production --prefix ./update-market-orders-service \
    && npm cache clean --force

FROM node:20.12 as build
WORKDIR /usr/app
COPY --from=deps ./usr/app/ .
COPY ./update-market-orders-service/ ./update-market-orders-service/
ENV NODE_ENV production
RUN npm install --include=dev --omit=peer --omit=optional --prefix ./update-market-orders-service \
    && npm cache clean --force \
    && npm run build --prefix ./update-market-orders-service

FROM node:20.12

ENV NODE_ENV production

RUN mkdir /usr/app && chown -R node:node /usr/app

USER node
WORKDIR /usr/app

COPY --chown=node:node --from=deps ./usr/app/shared/ ./shared/
COPY --chown=node:node --from=shared-deps ./usr/app/shared/node_modules ./shared/node_modules
COPY --chown=node:node --from=deps ./usr/app/update-market-orders-service ./update-market-orders-service/
COPY --chown=node:node --from=build ./usr/app/update-market-orders-service/build/ ./update-market-orders-service/build/

CMD [ "node", "./update-market-orders-service/build/main.js" ]
