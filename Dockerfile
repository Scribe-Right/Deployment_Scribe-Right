# Use the official Node.js image as a base
FROM node:16-slim

# Update and install prerequisites
RUN apt-get update && \
    apt-get install -y software-properties-common curl gnupg2 && \
    rm -rf /var/lib/apt/lists/*

# Add the deadsnakes PPA to get Python 3.10
RUN add-apt-repository ppa:deadsnakes/ppa && \
    apt-get update && \
    apt-get install -y python3.10 python3-pip --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Set Python 3.10 as the default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1 && \
    update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

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
RUN pip install --no-cache-dir --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt

# Set environment variable for the app port
ENV PORT=3000

# Expose the port your app will run on
EXPOSE $PORT

# Command to run your application
CMD ["node", "api/server.js"]
