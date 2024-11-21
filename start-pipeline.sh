#!/bin/bash

# Step 1: Create RabbitMQ deployment
kubectl apply -f ./k8_config/rabbitmq.yaml

# Step 2: Wait for RabbitMQ to become ready
echo "Waiting for RabbitMQ to initialize (30 seconds)..."
sleep 30

# Step 3: Deploy client-gateway
kubectl apply -f ./k8_config/client-gateway.yaml

# Step 4: Deploy order-manager
kubectl apply -f ./k8_config/order-manager.yaml

# Step 5: Deploy market-data-publisher
kubectl apply -f ./k8_config/market-data-publisher.yaml

# Step 7: Display services and pods
echo "All services and pods are running:"
kubectl get services
kubectl get pods

# Run command: ./start-pipeline.sh
#