FROM node:16-alpine AS BUILD

WORKDIR /app/

COPY package.json .

RUN npm install --production

COPY . .

RUN npm run build

FROM node:16-alpine

WORKDIR /app/

ENV PORT=8181

EXPOSE ${PORT}

COPY --from=BUILD /app/dist /app/dist/

COPY --from=BUILD /app/node_modules /app/node_modules

COPY . .

CMD ["npm", "run", "start"]  