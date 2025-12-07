#!/bin/bash
# Start the FastAPI backend server

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

