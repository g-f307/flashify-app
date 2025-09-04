# Dockerfile para o frontend Next.js
FROM node:20-alpine
WORKDIR /app
COPY . /app
RUN corepack enable && pnpm install --frozen-lockfile
EXPOSE 3000
CMD ["pnpm", "dev"]
