const fs = require("fs");
const split2 = require("split2");
const amqp = require("amqplib");
const assert = require("assert");

async function streamOrders(cvs_filepath) {
  const connection = await amqp.connect("amqp://rabbitmq");
  const channel = await connection.createChannel();
  const queue = "orders";

  // Ensure the queue exists
  await channel.assertQueue(queue, { durable: true });

  const orderStream = fs
    .createReadStream(cvs_filepath, { encoding: "utf-8" })
    .pipe(split2());

  // Loop through each line of the CSV and send to the queue
  for await (const line of orderStream) {
    const order = parseLine(line);
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(order)), {
      persistent: true,
    });
  }

  // Close the connection after all lines are processed
  console.log("Stream ended, closing connection...");
  connection.close();
}

function parseLine(line) {
  const fields = line.split(",");
  assert.equal(fields.length, 7, "Expected 7 fields!");
  return {
    user_id: fields[0],
    timestamp_ns: fields[1],
    price: fields[2],
    symbol: fields[3],
    quantity: fields[4],
    order_type: fields[5],
    trader_type: fields[6],
  };
}

const cvs_filepath = "/app/data/market_simulation_orders-1h.csv";
streamOrders(cvs_filepath);
