# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is ClawHawk

A real-time dashboard for monitoring Claude Code sessions. Go backend reads JSONL session files from `~/.claude/projects/`, parses them, and pushes grouped data to a React frontend over WebSocket. Ships as a single binary with the frontend embedded.

## Build & Run

```bash
make build          # Build frontend (bun) + Go binary
make run            # Build and run on :3333
make clean          # Remove binary, dist/, node_modules
```
