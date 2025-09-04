# Dockerfile para o frontend Next.js
FROM node:20-alpine
WORKDIR /app

# Copiar apenas os arquivos de configuração primeiro
COPY package.json pnpm-lock.yaml* next.config.mjs postcss.config.mjs tailwind.config.js tsconfig.json* ./

# Instalar dependências
RUN corepack enable && pnpm install

# Copiar o resto dos arquivos
COPY . .

EXPOSE 3000
CMD ["pnpm", "dev"]
