#!/bin/bash

# Step 1: Create RabbitMQ deployment
kubectl apply -f rabbitmq-deployment.yaml

# Step 2: Wait for RabbitMQ to be ready
echo "Waiting for RabbitMQ to start..."
kubectl wait --for=condition=available --timeout=120s deployment/rabbitmq

# Step 3: Deploy client-gateway
kubectl apply -f client-gateway-deployment.yaml

# Step 4: Deploy order-manager
kubectl apply -f order-manager-deployment.yaml

# Step 5: Deploy market-data-publisher
kubectl apply -f market-data-publisher-deployment.yaml

# Step 6: Verify all deployments are running
echo "Waiting for all deployments to be ready..."
kubectl wait --for=condition=available --timeout=120s deployment/client-gateway
kubectl wait --for=condition=available --timeout=120s deployment/order-manager
kubectl wait --for=condition=available --timeout=120s deployment/market-data-publisher

# Step 7: Display services and pods
echo "All services and pods are running:"
kubectl get services
kubectl get pods
