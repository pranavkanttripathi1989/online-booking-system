# MediBook Developer Makefile
# Usage: make <target>

.PHONY: help up down restart build logs bash migrate seed fresh test-be test-fe shell-mysql

# ─── Colours ───────────────────────────────────────────────────────────────────
GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
RESET  := \033[0m

# ─── Default target ────────────────────────────────────────────────────────────
help: ## Show this help message
	@echo ""
	@echo "  $(CYAN)MediBook — Docker Developer Commands$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# ─── Docker Lifecycle ──────────────────────────────────────────────────────────
up: ## Start all containers in detached mode
	@echo "$(CYAN)Starting MediBook services...$(RESET)"
	docker-compose up -d --build
	@echo "$(GREEN)✓ All services running!$(RESET)"
	@echo "  Frontend:     http://localhost:3000"
	@echo "  API/GraphQL:  http://localhost:8000/graphql"
	@echo "  phpMyAdmin:   http://localhost:8080"

down: ## Stop and remove all containers
	@echo "$(YELLOW)Stopping services...$(RESET)"
	docker-compose down
	@echo "$(GREEN)✓ All services stopped$(RESET)"

down-v: ## Stop containers AND remove volumes (WARNING: deletes DB data)
	@echo "$(YELLOW)Stopping services and removing volumes...$(RESET)"
	docker-compose down -v
	@echo "$(GREEN)✓ Done$(RESET)"

restart: ## Restart all containers
	docker-compose restart

build: ## Rebuild all Docker images from scratch
	docker-compose build --no-cache

# ─── Logs ──────────────────────────────────────────────────────────────────────
logs: ## Tail logs from all containers
	docker-compose logs -f

logs-php: ## Tail PHP-FPM logs only
	docker-compose logs -f php-fpm

logs-nginx: ## Tail Nginx logs only
	docker-compose logs -f nginx

logs-fe: ## Tail frontend logs only
	docker-compose logs -f frontend

# ─── Shell Access ──────────────────────────────────────────────────────────────
bash: ## Open a bash shell inside the PHP-FPM container
	docker-compose exec php-fpm bash

bash-fe: ## Open a shell inside the frontend container
	docker-compose exec frontend sh

shell-mysql: ## Open MySQL CLI as root
	docker-compose exec mysql mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} ${MYSQL_DATABASE:-medibook_db}

# ─── Laravel Commands ──────────────────────────────────────────────────────────
migrate: ## Run Laravel database migrations
	@echo "$(CYAN)Running migrations...$(RESET)"
	docker-compose exec php-fpm php artisan migrate --force
	@echo "$(GREEN)✓ Migrations complete$(RESET)"

migrate-fresh: ## Drop all tables and re-run migrations
	@echo "$(YELLOW)Dropping all tables and re-migrating...$(RESET)"
	docker-compose exec php-fpm php artisan migrate:fresh --force
	@echo "$(GREEN)✓ Fresh migration complete$(RESET)"

seed: ## Run database seeders
	@echo "$(CYAN)Seeding database...$(RESET)"
	docker-compose exec php-fpm php artisan db:seed --force
	@echo "$(GREEN)✓ Database seeded$(RESET)"

fresh: ## Full reset: drop tables + migrate + seed
	@echo "$(YELLOW)Full database reset...$(RESET)"
	docker-compose exec php-fpm php artisan migrate:fresh --seed --force
	@echo "$(GREEN)✓ Database reset and seeded$(RESET)"

artisan: ## Run an artisan command. Usage: make artisan CMD="route:list"
	docker-compose exec php-fpm php artisan $(CMD)

key: ## Generate a new Laravel app key
	docker-compose exec php-fpm php artisan key:generate

optimize: ## Run Laravel optimisation (cache config, routes, views)
	docker-compose exec php-fpm php artisan optimize

optimize-clear: ## Clear all Laravel caches
	docker-compose exec php-fpm php artisan optimize:clear

horizon: ## Start Laravel Horizon queue monitor
	docker-compose exec php-fpm php artisan horizon

# ─── npm Commands ──────────────────────────────────────────────────────────────
npm-install: ## Install frontend npm dependencies
	docker-compose exec frontend npm install

npm-build: ## Build frontend for production
	docker-compose exec frontend npm run build

# ─── Testing ───────────────────────────────────────────────────────────────────
test-be: ## Run PHPUnit tests (backend)
	@echo "$(CYAN)Running backend tests...$(RESET)"
	docker-compose exec php-fpm php artisan test

test-be-coverage: ## Run PHPUnit tests with coverage report
	docker-compose exec php-fpm php artisan test --coverage --min=70

test-fe: ## Run Jest tests (frontend)
	@echo "$(CYAN)Running frontend tests...$(RESET)"
	docker-compose exec frontend npm test -- --watchAll=false

test-e2e: ## Run Playwright E2E tests
	docker-compose exec frontend npm run e2e

lint-be: ## Run PHP CS Fixer (Laravel Pint)
	docker-compose exec php-fpm ./vendor/bin/pint

lint-fe: ## Run ESLint on frontend
	docker-compose exec frontend npm run lint

# ─── GraphQL ───────────────────────────────────────────────────────────────────
schema-validate: ## Validate the GraphQL schema
	docker-compose exec php-fpm php artisan lighthouse:validate-schema

schema-print: ## Print the compiled GraphQL schema
	docker-compose exec php-fpm php artisan lighthouse:print-schema

# ─── Composer ──────────────────────────────────────────────────────────────────
composer-install: ## Install PHP composer dependencies
	docker-compose exec php-fpm composer install

composer-update: ## Update PHP composer dependencies
	docker-compose exec php-fpm composer update

# ─── Status ────────────────────────────────────────────────────────────────────
ps: ## Show running container status
	docker-compose ps

health: ## Check health of all services
	@echo ""
	@echo "$(CYAN)Container Health Status:$(RESET)"
	@docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
	@echo ""
