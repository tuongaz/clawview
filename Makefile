.PHONY: build run dev clean

build:
	cd frontend && bun install && bun run build
	uv sync

run: build
	uv run clawlens

dev:
	@echo "Run in two terminals:"
	@echo "  Terminal 1: cd frontend && bun run dev"
	@echo "  Terminal 2: uv run clawlens"

clean:
	rm -rf web/dist
	rm -rf frontend/node_modules
	rm -rf .venv
