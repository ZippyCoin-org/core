FROM node:18-alpine

WORKDIR /app

# Install Truffle globally
RUN npm install -g truffle

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port for Truffle develop
EXPOSE 9545

# Start Truffle development environment
CMD ["npx", "truffle", "develop"]


