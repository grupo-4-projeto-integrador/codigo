#!/bin/bash
case "$1" in
  up)    docker compose up -d && sleep 3 && open http://localhost:5173 ;;
  down)  docker compose down ;;
  reset) docker compose down -v && docker compose up -d ;;
  logs)  docker compose logs -f ;;
  db)    docker exec -it flamboyant_db psql -U flamboyant flamboyant_seguros ;;
  seed)  docker exec -it flamboyant_db psql -U flamboyant flamboyant_seguros \
           -f /docker-entrypoint-initdb.d/03_seed_data.sql ;;
  *)     echo "Uso: ./dev.sh [up|down|reset|logs|db|seed]" ;;
esac
