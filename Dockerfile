# Use the official Python 3.10 image as a base
FROM python:3.10-slim

# Update and install Node.js and other prerequisites
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (version 16 in this example)
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies first
COPY package.json package-lock.json ./

# Configure npm to ignore strict SSL
RUN npm config set strict-ssl false

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Install Python dependencies from requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Set environment variable for the app port
ENV PORT=3000

# Expose the port your app will run on
EXPOSE $PORT

# Command to run your application
CMD ["node", "api/server.js"]