FROM nginx:alpine

# Copy the built docs
COPY build/ /usr/share/nginx/html/

# Copy custom nginx config if needed
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80 