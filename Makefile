.PHONY: install dev test lint format check docker-build docker-run

install:
	pip install -r backend/requirements.txt

dev:
	uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

test:
	pytest -q

lint:
	ruff check backend tests

format:
	ruff format backend tests

check: lint test

docker-build:
	docker build -t firsat-avcisi .

docker-run:
	docker run --env-file .env -p 8000:8000 -v $$(pwd)/data:/app/data firsat-avcisi
