#!/bin/bash

# Ring Customizer - Development Server
echo "Starting Ring Customizer..."

# Activate virtual environment
source .venv/bin/activate

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
fi

# Start the Flask development server
echo "Flask app will be available at: http://localhost:5001"
python app/main.py