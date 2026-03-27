.PHONY: build run dev clean

build:
	cd frontend && bun install && bun run build
	go build -o clawhawk .

run: build
	./clawhawk

dev:
	@echo "Run in two terminals:"
	@echo "  Terminal 1: cd frontend && bun run dev"
	@echo "  Terminal 2: go run ."

clean:
	rm -f clawhawk
	rm -rf web/dist
	rm -rf frontend/node_modules
