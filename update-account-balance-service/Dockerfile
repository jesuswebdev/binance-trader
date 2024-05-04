FROM node:20.12.0 as shared
WORKDIR /usr/app
COPY ./shared ./shared/
ENV NODE_ENV production
RUN npm install --include=dev --prefix ./shared \
    && npm run build --prefix ./shared \
    && npm cache clean --force
    
FROM node:20.12.0 as shared-deps
WORKDIR /usr/app
COPY --from=shared ./usr/app/shared/package*.json ./shared/
RUN npm ci --only=production --prefix ./shared \
    && npm cache clean --force

FROM node:20.12.0 as deps
WORKDIR /usr/app
COPY ./update-account-balance-service/package*.json ./update-account-balance-service/
COPY --from=shared ./usr/app/shared/package.json ./shared/
COPY --from=shared ./usr/app/shared/build/ ./shared/build/
RUN npm ci --only=production --prefix ./update-account-balance-service \
    && npm cache clean --force

FROM node:20.12.0 as build
WORKDIR /usr/app
COPY --from=deps ./usr/app/ .
COPY ./update-account-balance-service/ ./update-account-balance-service/
ENV NODE_ENV production
RUN npm install --include=dev --omit=peer --omit=optional --prefix ./update-account-balance-service \
    && npm cache clean --force \
    && npm run build --prefix ./update-account-balance-service

FROM node:20.12.0

ENV NODE_ENV production

RUN mkdir /usr/app && chown -R node:node /usr/app

USER node
WORKDIR /usr/app

COPY --chown=node:node --from=deps ./usr/app/shared/ ./shared/
COPY --chown=node:node --from=shared-deps ./usr/app/shared/node_modules ./shared/node_modules
COPY --chown=node:node --from=deps ./usr/app/update-account-balance-service ./update-account-balance-service/
COPY --chown=node:node --from=build ./usr/app/update-account-balance-service/dist/ ./update-account-balance-service/dist/

CMD [ "node", "./update-account-balance-service/dist/main.js" ]