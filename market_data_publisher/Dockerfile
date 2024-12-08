# Use the specific version of Node.js
FROM node:22.11.0

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json for dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of application code
COPY . .

EXPOSE 8080

# Command to run application
CMD ["node", "main.js"]