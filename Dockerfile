FROM node:12.16-slim AS base
FROM base AS build
ARG NPM_GITHUB_READ
ENV NPM_GITHUB_READ=$NPM_GITHUB_READ
WORKDIR /usr/src/app
COPY . .
RUN npm install
#RUN npm run test
RUN npm run clear
RUN npm run build_ts
# RUN npm prune --production
FROM base
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=build /usr/src /usr/src
# connect the repository to the container
LABEL org.opencontainers.image.source https://github.com/zabkwak/mat-twitter-downloader
EXPOSE 8080
CMD [ "node", "index.js" ]
