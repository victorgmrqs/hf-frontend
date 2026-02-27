# Stage 1: Build
FROM node:20-slim AS build

WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./
RUN npm ci

# Copia o restante do código
COPY . .

# Build da aplicação
RUN npm run build

# Stage 2: Serve com Nginx
FROM nginx:stable-alpine

# Copia os arquivos estáticos do build
COPY --from=build /app/dist /usr/share/nginx/html

# Copia configuração customizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
