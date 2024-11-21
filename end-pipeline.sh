#!/bin/bash
kubectl delete deployment --all
kubectl delete service --all
kubectl delete statefulset --all

kubectl get pods