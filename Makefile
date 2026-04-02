.PHONY: build run dev clean deploy

build:
	cd frontend && bun install && bun run build
	uv sync

run: build
	uv run clawview

dev:
	@echo "Run in two terminals:"
	@echo "  Terminal 1: cd frontend && bun run dev"
	@echo "  Terminal 2: uv run clawview"

deploy: build
	rm -rf dist
	uv build
	uv publish --token $(PYPI_TOKEN)

clean:
	rm -rf src/clawview/web
	rm -rf frontend/node_modules
	rm -rf .venv
	rm -rf dist
