FROM node:20.12.0 AS build
WORKDIR /usr/app
COPY ./web/ ./web/
RUN npm install --include=dev --omit=peer --omit=optional --legacy-peer-deps --prefix ./web \
    && npm cache clean --force \
    && npm run build --prefix ./web


FROM nginx:alpine 
COPY ./web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build ./usr/app/web/dist/ /usr/share/nginx/html