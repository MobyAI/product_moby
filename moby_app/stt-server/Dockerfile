# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=23.2.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# --- Build Stage ---
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Install node modules
COPY package*.json ./
RUN npm ci

# Copy your app code (everything else)
COPY . .

# --- Final Stage ---
FROM base

# Copy built app from previous stage
COPY --from=build /app /app

# Set working directory
WORKDIR /app

# Open your STT ports (update if needed)
EXPOSE 3001
EXPOSE 3002

# Start the app
CMD ["node", "index.js"]