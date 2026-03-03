#!/bin/bash
# Modern House Best Crawler Scheduler Script

# Move to the dashboard directory
cd "$(dirname "$0")"

# Activate the virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run the crawler and append output to log
python3 generic_crawler/modernhouse_crawler.py >> cron_modernhouse.log 2>&1
