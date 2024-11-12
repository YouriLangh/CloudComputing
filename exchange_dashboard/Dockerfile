# Use the official Node.js image to build the app
FROM node:22.11.0 AS build

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Vite app for production
RUN npm run build

# Use the official Nginx image to serve the app
FROM nginx:alpine

# Copy the built Vite app into the Nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose the port for Nginx
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
