"""ClawHawk – real-time Claude Code session dashboard."""

import argparse

import uvicorn
from fastapi import FastAPI

app = FastAPI(title="ClawHawk")


def main() -> None:
    parser = argparse.ArgumentParser(description="ClawHawk dashboard server")
    parser.add_argument("--port", type=int, default=3333)
    args = parser.parse_args()
    uvicorn.run(app, host="0.0.0.0", port=args.port)
