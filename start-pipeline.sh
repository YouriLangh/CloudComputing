#!/bin/bash
kubectl apply -f ./k8_config/redis.yaml

# Step 1: Create RabbitMQ deployment
kubectl apply -f ./k8_config/rabbitmq.yaml

# Step 2: Wait for RabbitMQ to become ready
echo "Waiting for RabbitMQ to initialize (25 seconds)..."
sleep 25

kubectl apply -f ./k8_config/metric-server-components.yaml

# Step 3: Deploy client-gateway & HPA
kubectl apply -f ./k8_config/client-gateway.yaml

# Step 4: Deploy order-manager & HPA
kubectl apply -f ./k8_config/order-manager.yaml

# Step 5: Deploy market-data-publisher
kubectl apply -f ./k8_config/market-data-publisher.yaml

# Step 7: Display services and pods
echo "All services and pods are running:"
kubectl get services
kubectl get pods
