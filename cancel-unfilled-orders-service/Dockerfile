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
COPY ./cancel-unfilled-orders-service/package*.json ./cancel-unfilled-orders-service/
COPY --from=shared ./usr/app/shared/package.json ./shared/
COPY --from=shared ./usr/app/shared/build/ ./shared/build/
RUN npm ci --only=production --prefix ./cancel-unfilled-orders-service \
    && npm cache clean --force

FROM node:20.12 as build
WORKDIR /usr/app
COPY --from=deps ./usr/app/ .
COPY ./cancel-unfilled-orders-service/ ./cancel-unfilled-orders-service/
ENV NODE_ENV production
RUN npm install --include=dev --omit=peer --omit=optional --prefix ./cancel-unfilled-orders-service \
    && npm cache clean --force \
    && npm run build --prefix ./cancel-unfilled-orders-service

FROM node:20.12

ENV NODE_ENV production

RUN mkdir /usr/app && chown -R node:node /usr/app

USER node
WORKDIR /usr/app

COPY --chown=node:node --from=deps ./usr/app/shared/ ./shared/
COPY --chown=node:node --from=shared-deps ./usr/app/shared/node_modules ./shared/node_modules
COPY --chown=node:node --from=deps ./usr/app/cancel-unfilled-orders-service ./cancel-unfilled-orders-service/
COPY --chown=node:node --from=build ./usr/app/cancel-unfilled-orders-service/build/ ./cancel-unfilled-orders-service/build/

CMD [ "node", "./cancel-unfilled-orders-service/build/main.js" ]
