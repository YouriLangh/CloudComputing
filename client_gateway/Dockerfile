# Use the specific version of Node.js
FROM node:22.11.0

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json for dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Command to run your application
CMD ["node", "main.js"]