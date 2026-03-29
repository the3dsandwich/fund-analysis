# Stage 1: Build React app + install Playwright
FROM node:22-bookworm AS build

WORKDIR /app

# Install root dependencies (playwright)
COPY package.json package-lock.json ./
RUN npm ci

# Install Playwright Chromium browser
RUN npx playwright install --with-deps chromium

# Build React presentation
COPY presentation/package.json presentation/package-lock.json ./presentation/
RUN cd presentation && npm ci
COPY presentation/ ./presentation/
RUN cd presentation && npm run build

# Stage 2: Runtime
FROM node:22-bookworm-slim

# Install nginx, cron, and Playwright browser dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    cron \
    # Playwright Chromium dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libwayland-client0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy node_modules and Playwright browsers from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /root/.cache/ms-playwright /root/.cache/ms-playwright

# Copy research source code
COPY research/ ./research/
COPY package.json ./

# Copy Docker scripts
COPY docker/ ./docker/
RUN chmod +x docker/entrypoint.sh docker/refresh.sh

# Copy built React app to nginx
COPY --from=build /app/presentation/dist /usr/share/nginx/html

# Copy nginx config
RUN rm -f /etc/nginx/sites-enabled/default
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Create snapshots directory
RUN mkdir -p /data/snapshots

EXPOSE 80

ENTRYPOINT ["/app/docker/entrypoint.sh"]
