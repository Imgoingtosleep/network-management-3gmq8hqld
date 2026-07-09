FROM node:22-alpine

WORKDIR /app

COPY backend/package*.json ./

RUN npm ci --only=production

COPY backend/ .

ENV PORT=4000
ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "src/server.js"]
