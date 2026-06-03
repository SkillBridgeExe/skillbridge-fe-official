# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies (leveraging Docker cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy all source files
COPY . .

# Expose port 8080
EXPOSE 8080

# Start Nginx
CMD ["npm", "run", "dev", "--", "--host"]
