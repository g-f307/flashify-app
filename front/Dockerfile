# Dockerfile para o frontend Next.js
FROM node:20-alpine
WORKDIR /app

# Instalar corepack e habilitar pnpm globalmente
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar apenas os arquivos de configuração primeiro
COPY package.json pnpm-lock.yaml* next.config.mjs postcss.config.mjs tailwind.config.js tsconfig.json* ./

# Instalar todas as dependências (incluindo @radix-ui/react-progress)
RUN pnpm install

# Copiar o resto dos arquivos
COPY . .

EXPOSE 3000
CMD ["pnpm", "dev"]
