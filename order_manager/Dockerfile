# Use the specific version of Node.js
FROM node:22.11.0

# Copy package.json and package-lock.json for dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Command to run application
CMD ["node", "main.js"]