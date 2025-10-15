echo "Iniciando o deploy para o ambiente de produção..."

docker compose -f docker-compose.prod.yml down

docker compose -f docker-compose.prod.yml --env-file ./front/.env up --build -d

echo "Deploy concluído com sucesso!"