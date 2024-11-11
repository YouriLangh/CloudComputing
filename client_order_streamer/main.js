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

  for await (const line of orderStream) {
    const order = parseLine(line);
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(order)), {
      persistent: true,
    });
  }

  setTimeout(() => {
    connection.close();
  }, 500); // Close the connection after a delay to ensure all messages are sent
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
