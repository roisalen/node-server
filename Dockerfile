# Production image for ECS Fargate / App Runner (see roisalen-server/infra/aws/)
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN chown -R node:node /app

ENV NODE_ENV=production
EXPOSE 8080

USER node

CMD ["node", "server.js"]
