# Use the official Node.js image for building the app
FROM node:22.11.0 as builder

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

# Use the official Nginx image to serve the built files
FROM nginx:alpine

# Copy the build output from the builder stage into Nginx's public directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 (the default port for Nginx)
EXPOSE 80

# Default command is already set to run Nginx
CMD ["nginx", "-g", "daemon off;"]
