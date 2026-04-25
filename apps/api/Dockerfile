FROM node:25-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
RUN pnpm install --frozen-lockfile --filter @motionops/api...

FROM base AS build
WORKDIR /app
COPY --from=deps /app .
COPY apps/api apps/api
COPY packages/types packages/types
COPY tsconfig.base.json .
RUN pnpm --filter @motionops/api build

FROM node:25-alpine AS runner
WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json .
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/index.js"]
