FROM nginx:alpine

# Copy static files from admin-console
COPY admin-console/ /usr/share/nginx/html/

# Copy shared assets
COPY assets/ /usr/share/nginx/html/assets/

# Copy custom nginx config
COPY admin-console/nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY admin-console/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
