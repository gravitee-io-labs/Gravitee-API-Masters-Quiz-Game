#!/bin/sh
set -e

# Inject API_BASE_URL into the HTML file at runtime
if [ -n "$API_BASE_URL" ]; then
    echo "Injecting API_BASE_URL: $API_BASE_URL"
    sed -i "s|// Set window.API_BASE_URL before loading api.js if needed for production|window.API_BASE_URL = '$API_BASE_URL';|g" /usr/share/nginx/html/index.html
fi

# Start nginx
exec nginx -g 'daemon off;'
