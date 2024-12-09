# CloudComputing
 Project for Cloud Computing 2024-2025 


# Choices:
To run the project
Build the images using the build-images.sh script and then start the pipeline using the start-pipeline.sh script.
To run the dashboard, navigate to the exchange-dashboard folder "cd exchange-dashboard" and run "npm run dev"


kubectl get hpa/market-data-publisher-hpa --watch
to watch the autoscaling

autocannon -c 1000 -d 120 http://localhost:8080/ // Running 1500 connections for 2 minutes