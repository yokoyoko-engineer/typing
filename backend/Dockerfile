FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --chown=node:node . .

# Ensure data directory exists and is writable by node user
RUN mkdir -p /app/data && chown -R node:node /app/data

# Security: 非rootユーザーで実行
USER node

EXPOSE 3001

CMD ["node", "server.js"]
