FROM nginx:alpine

# Copy static files from scoreboard
COPY scoreboard/ /usr/share/nginx/html/

# Copy shared assets
COPY assets/ /usr/share/nginx/html/assets/

# Copy custom nginx config
COPY scoreboard/nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY scoreboard/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
