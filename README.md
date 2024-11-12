# CloudComputing
 Project for Cloud Computing 2024-2025 


# Choices:
Why queues? The speed at which orders werebeing streamed had to be tapered. We can verify loads of this queue/service and scale more consumers
Why kafka? slwoer than redis but allows for pub/sub system and longterm storage
--> Does not keep the order, so we might want to switch to redis.
this stackoverflow post solves that issue:
https://stackoverflow.com/questions/73087447/kafka-messages-ordering-not-being-respected-on-the-last-two-messages
partition per symbol