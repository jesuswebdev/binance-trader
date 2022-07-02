FROM node:16.15.1-alpine as shared
WORKDIR /usr/app
COPY ./shared ./shared/
ENV NODE_ENV production
RUN npm install --include=dev --prefix ./shared \
    && npm run build --prefix ./shared \
    && npm cache clean --force 
    

FROM node:16.15.1-alpine as deps
WORKDIR /usr/app
COPY ./trader/package*.json ./trader/
COPY --from=shared ./usr/app/shared/package.json ./shared/
COPY --from=shared ./usr/app/shared/build/ ./shared/build/
RUN npm ci --only=production --prefix ./trader \
    && npm cache clean --force

FROM node:16.15.1-alpine as build
WORKDIR /usr/app
COPY --from=deps ./usr/app/ .
COPY ./trader/ ./trader/
ENV NODE_ENV production
RUN npm install --include=dev --omit=peer --omit=optional --prefix ./trader \
    && npm cache clean --force \
    && npm run build --prefix ./trader

FROM node:16.15.1-alpine

ENV NODE_ENV production

RUN mkdir /usr/app && chown -R node:node /usr/app

USER node
WORKDIR /usr/app

COPY --chown=node:node --from=shared ./usr/app/shared/package.json ./shared/
COPY --chown=node:node --from=shared ./usr/app/shared/build/ ./shared/build/
COPY --chown=node:node --from=deps ./usr/app/trader ./trader/
COPY --chown=node:node --from=build ./usr/app/trader/build/ ./trader/build/

CMD [ "node", "./trader/build/index.js" ]
