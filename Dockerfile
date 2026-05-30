FROM node:26-alpine3.22 AS builder

WORKDIR /app

RUN apk upgrade --no-cache

RUN npm install -g pnpm@11.1.3

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

RUN pnpm run build

FROM node:26-alpine3.22 AS runner

WORKDIR /app

RUN apk upgrade --no-cache
RUN npm install -g pnpm@11.1.3

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist

CMD ["node", "dist/main.js"]
