.PHONY: install run dev test lint format format-check check ci docker-build docker-run

install:
	pip install -r backend/requirements.txt

run:
	python run.py

dev:
	uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

test:
	pytest

lint:
	ruff check backend tests

format:
	ruff format backend tests

format-check:
	ruff format --check backend tests

check: lint format-check test

ci: install check

docker-build:
	docker build -t firsat-avcisi .

docker-run:
	docker run --env-file .env -p 8000:8000 -v $$(pwd)/data:/app/data firsat-avcisi
