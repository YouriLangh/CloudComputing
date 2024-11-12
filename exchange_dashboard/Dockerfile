FROM nginx:alpine

# Copy the built Vite app into the Nginx html directory
COPY ./dist /usr/share/nginx/html

# Expose the port for Nginx
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
