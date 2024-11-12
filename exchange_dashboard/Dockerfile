# Use the official Node.js image
FROM node:22.11.0

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

# Install a lightweight web server to serve the built files
RUN npm install -g serve

# Expose the port the app will run on
EXPOSE 5000

# Command to start the app
CMD ["serve", "-s", "dist", "-l", "5000"]
