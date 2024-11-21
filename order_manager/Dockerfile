# Use the specific version of Node.js
FROM node:22.11.0

# Copy package.json and package-lock.json for dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy your application code
COPY . .

# Command to run your application
CMD ["node", "main.js"]