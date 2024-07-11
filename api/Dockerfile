FROM node:20.12.0 AS shared
WORKDIR /usr/app
COPY ./shared ./shared/
ENV NODE_ENV=production
RUN npm install --include=dev --prefix ./shared \
    && npm run build --prefix ./shared \
    && npm cache clean --force
    
FROM node:20.12.0 AS shared-deps
WORKDIR /usr/app
COPY --from=shared ./usr/app/shared/package*.json ./shared/
RUN npm ci --only=production --prefix ./shared \
    && npm cache clean --force

FROM node:20.12.0 AS deps
WORKDIR /usr/app
COPY ./api/package*.json ./api/
COPY --from=shared ./usr/app/shared/package.json ./shared/
COPY --from=shared ./usr/app/shared/build/ ./shared/build/
RUN npm ci --only=production --prefix ./api \
    && npm cache clean --force

FROM node:20.12.0 AS build
WORKDIR /usr/app
COPY --from=deps ./usr/app/ .
COPY ./api/ ./api/

RUN npm install --include=dev --omit=peer --omit=optional --prefix ./api \
    && npm cache clean --force \
    && npm run build --prefix ./api

FROM node:20.12.0

ENV NODE_ENV=production

RUN mkdir /usr/app && chown -R node:node /usr/app

USER node
WORKDIR /usr/app

COPY --chown=node:node --from=deps ./usr/app/shared/ ./shared/
COPY --chown=node:node --from=shared-deps ./usr/app/shared/node_modules ./shared/node_modules
COPY --chown=node:node --from=deps ./usr/app/api ./api/
COPY --chown=node:node --from=build ./usr/app/api/dist/ ./api/dist/

CMD [ "node", "./api/dist/main.js" ]