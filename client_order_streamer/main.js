const fs = require("fs");
const split2 = require("split2");
const amqp = require("amqplib");
const assert = require("assert");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function streamOrders(cvs_filepath) {
  const connection = await amqp.connect("amqp://rabbitmq");
  const channel = await connection.createChannel();
  const queue = "orders";

  await channel.assertQueue(queue, { durable: true });

  const orderStream = fs
    .createReadStream(cvs_filepath, { encoding: "utf-8" })
    .pipe(split2());

  for await (const line of orderStream) {
    try {
      const order = parseLine(line);
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(order)), {
        persistent: true,
      });
      // Limit the rate
      await sleep(100); // 50ms delay = 20 messages/sec
    } catch (error) {
      console.error("Error processing line:", line, error);
    }
  }

  console.log("Finished streaming orders. Closing connection in 5 seconds...");
  setTimeout(() => connection.close(), 5000);
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
