# Docker Commands Reference — Medicare31

## Quick Start

### Start the entire project
```bash
docker compose up --build
```

### Start in background (detached mode)
```bash
docker compose up -d --build
```

### Stop all services
```bash
docker compose down
```

### Stop AND remove database volume (clean slate)
```bash
docker compose down -v
```

---

## Building & Rebuilding

### Build all services
```bash
docker compose build
```

### Build a specific service (backend only)
```bash
docker compose build backend
```

### Build a specific service (frontend only)
```bash
docker compose build frontend
```

### Build with no cache (fresh build)
```bash
docker compose build --no-cache
```

### Build specific service with no cache
```bash
docker compose build --no-cache backend
```

---

## Starting Services

### Start all services
```bash
docker compose up
```

### Start all services in background
```bash
docker compose up -d
```

### Start only backend
```bash
docker compose up backend
```

### Start only frontend
```bash
docker compose up frontend
```

### Start only database
```bash
docker compose up db
```

### Start backend and database (skip frontend/nginx)
```bash
docker compose up backend db
```

### Restart all services
```bash
docker compose restart
```

### Restart a specific service
```bash
docker compose restart backend
```

### Restart database
```bash
docker compose restart db
```

---

## Stopping Services

### Stop all services (keep volumes/data)
```bash
docker compose stop
```

### Stop and remove services (keep volumes/data)
```bash
docker compose down
```

### Stop and remove everything INCLUDING database
```bash
docker compose down -v
```

### Stop only backend
```bash
docker compose stop backend
```

### Stop only frontend
```bash
docker compose stop frontend
```

---

## Viewing Logs

### View logs from all services
```bash
docker compose logs
```

### View logs in real-time (follow mode)
```bash
docker compose logs -f
```

### View logs from backend only
```bash
docker compose logs backend
```

### View logs from backend in real-time
```bash
docker compose logs -f backend
```

### View logs from frontend
```bash
docker compose logs frontend
```

### View logs from database
```bash
docker compose logs -f db
```

### View logs from nginx
```bash
docker compose logs -f nginx
```

### View last 50 lines
```bash
docker compose logs --tail=50 backend
```

---

## Container Status & Information

### List all running containers
```bash
docker compose ps
```

### List all containers (including stopped)
```bash
docker compose ps -a
```

### Check service status
```bash
docker compose ps backend
```

### Inspect a running container
```bash
docker inspect medicare31_backend_1
```

### Check container resource usage (CPU, memory)
```bash
docker stats
```

### Check stats for one container
```bash
docker stats medicare31_backend_1
```

---

## Executing Commands in Containers

### Open a shell in the backend container
```bash
docker compose exec backend /bin/bash
```

### Open a shell in the frontend container
```bash
docker compose exec frontend /bin/sh
```

### Run a Python command in backend
```bash
docker compose exec backend python -m pip list
```

### Run a shell command in database
```bash
docker compose exec db psql -U medicare -d medicaredb
```

### Execute a one-off command
```bash
docker compose exec -T backend python -c "print('Hello')"
```

---

## Database Operations

### Access PostgreSQL CLI inside database container
```bash
docker compose exec db psql -U medicare -d medicaredb
```

### List all tables in database
```bash
docker compose exec db psql -U medicare -d medicaredb -c "\dt"
```

### Backup database to file
```bash
docker compose exec db pg_dump -U medicare medicaredb > backup.sql
```

### Restore database from file
```bash
docker compose exec -T db psql -U medicare medicaredb < backup.sql
```

### View database logs
```bash
docker compose logs -f db
```

### Reset database (delete and recreate)
```bash
docker compose down -v
docker compose up -d db
```

---

## Development Workflow

### Rebuild and restart backend after code changes
```bash
docker compose up -d --build backend
```

### Rebuild and restart frontend after code changes
```bash
docker compose up -d --build frontend
```

### Pull latest changes and rebuild
```bash
docker compose up --build --pull always
```

### Watch backend logs while developing
```bash
docker compose logs -f backend
```

### Restart backend to apply changes (if --reload is not working)
```bash
docker compose restart backend
```

---

## Image Management

### List all Docker images
```bash
docker images
```

### List images used by this project
```bash
docker images | grep medicare
```

### Remove unused images
```bash
docker image prune
```

### Remove all images (caution!)
```bash
docker image prune -a
```

### Pull latest base images
```bash
docker pull python:3.11-slim
docker pull nginx:alpine
docker pull postgres:15-alpine
```

---

## Network Management

### List all Docker networks
```bash
docker network ls
```

### Inspect the project network
```bash
docker network inspect medicare31_default
```

### See which containers are connected to a network
```bash
docker network inspect medicare31_default --format='{{json .Containers}}'
```

---

## Volume Management

### List all Docker volumes
```bash
docker volume ls
```

### List volumes used by this project
```bash
docker volume ls | grep medicare
```

### Inspect database volume
```bash
docker volume inspect medicare31_db_data
```

### Remove unused volumes
```bash
docker volume prune
```

### Backup database volume
```bash
docker run --rm -v medicare31_db_data:/data -v $(pwd):/backup alpine tar czf /backup/db_backup.tar.gz -C /data .
```

---

## System Cleanup & Maintenance

### Remove stopped containers
```bash
docker container prune
```

### Remove all unused images, volumes, and networks
```bash
docker system prune
```

### Deep clean (CAUTION - removes everything unused)
```bash
docker system prune -a --volumes
```

### Check disk usage
```bash
docker system df
```

### Remove all images for this project
```bash
docker rmi $(docker images | grep medicare | awk '{print $3}')
```

---

## Troubleshooting

### Check if Docker daemon is running
```bash
docker ps
```

### Test Docker connection
```bash
docker info
```

### View Docker daemon logs (macOS)
```bash
tail -f ~/Library/Containers/com.docker.docker/Data/log/vm/dockerd.log
```

### View Docker daemon logs (Linux)
```bash
journalctl -xu docker.service
```

### Restart Docker daemon (macOS)
```bash
osascript -e 'quit app "Docker"'
open -a Docker
```

### Force remove a container
```bash
docker rm -f container_name
```

### Force remove all containers
```bash
docker rm -f $(docker ps -aq)
```

---

## Common Development Scenarios

### Scenario 1: I made changes to backend code
```bash
# Option 1: Restart (if --reload is enabled in Dockerfile)
docker compose restart backend

# Option 2: Rebuild and restart
docker compose up -d --build backend

# Option 3: Check logs for errors
docker compose logs -f backend
```

### Scenario 2: I made changes to frontend HTML/CSS/JS
```bash
# Rebuild frontend
docker compose up -d --build frontend

# Check logs
docker compose logs -f frontend
```

### Scenario 3: Database is acting weird
```bash
# Check logs
docker compose logs -f db

# Full reset (CAUTION - loses all data)
docker compose down -v
docker compose up -d db
docker compose up -d backend  # will recreate schema
```

### Scenario 4: Backend can't connect to database
```bash
# Check if db is healthy
docker compose ps db

# Check db logs
docker compose logs -f db

# Verify network connectivity
docker compose exec backend ping db
```

### Scenario 5: Port 80 already in use (nginx conflict)
```bash
# Find what's using port 80
docker ps --filter expose=80

# Or change port in docker-compose.yml:
# ports:
#   - "8080:80"  # use 8080 instead
```

### Scenario 6: Full project reset
```bash
# Stop everything and remove data
docker compose down -v

# Rebuild from scratch
docker compose up --build

# Backend will auto-create tables and seed roles
```

---

## Direct Docker Commands (without compose)

### Build backend image directly
```bash
docker build -t medicare31_backend:latest ./backend
```

### Run backend container directly
```bash
docker run -d --name backend \
  -p 8000:8000 \
  -e DATABASE_URL=postgresql://medicare:password@db:5432/medicaredb \
  medicare31_backend:latest
```

### Build frontend image directly
```bash
docker build -t medicare31_frontend:latest ./frontend
```

### Run frontend container directly
```bash
docker run -d --name frontend -p 80:80 medicare31_frontend:latest
```

### Interact with a running container
```bash
docker exec -it backend /bin/bash
```

---

## GitHub Actions CI/CD (Recommended)

For automated building and testing, add to `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: medicare
          POSTGRES_PASSWORD: medicare_pass
          POSTGRES_DB: medicaredb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Build backend
        run: docker build -t backend:test ./backend
      
      - name: Build frontend
        run: docker build -t frontend:test ./frontend
      
      - name: Run tests (backend)
        run: docker run --rm backend:test pytest
      
      - name: Lint (backend)
        run: docker run --rm backend:test pylint app/
```

---

## Notes

- **Default port**: Frontend accessible at `http://localhost`
- **API docs**: Available at `http://localhost/docs` (Swagger UI)
- **All services communicate over internal Docker network** — no need to expose internal ports
- **Database is NOT exposed** to host — only accessible from backend
- **--reload flag in backend** automatically restarts on code changes (dev only)
- **Remove --reload** before deploying to production
