#!/bin/bash

# Build service images
docker build -t client-gateway ./client_gateway
docker build -t order-manager ./order_manager
docker build -t market-data-publisher ./market_data_publisher
docker build -t client-order-streamer ./client_order_streamer