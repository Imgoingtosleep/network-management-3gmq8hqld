#!/bin/bash

# =================================================================
# NetOps Portal - Emergency Sync Script
# WARNING: This will DELETE all local changes and untracked files!
# =================================================================

echo "📡 1. Fetching latest data from origin..."
git fetch origin

echo "🔍 2. Previewing untracked files to be deleted (Dry Run)..."
git clean -fdn

echo "⏪ 3. Resetting to origin/main (Hard Reset)..."
git reset --hard origin/main

echo "🧹 4. Cleaning untracked files and directories..."
git clean -fd

echo "🚀 5. Restarting Docker containers to apply changes..."
docker-compose down && docker-compose up -d

echo "✅ DONE! Your local environment is now perfectly in sync with origin/main."
