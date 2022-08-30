FROM node:16.7.0

WORKDIR /app/

COPY package.json .

RUN npm install

COPY . .

RUN npm run build

ADD https://github.com/krallin/tini/releases/download/v0.19.0/tini /tini

RUN chmod +x /tini

ENTRYPOINT ["/tini", "--"]

CMD ["npm", "run", "start"]  