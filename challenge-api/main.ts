import mqtt from "mqtt";

const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
  client.subscribe("challenge");
});

client.on("message", (topic, message) => {
  console.log(message.toString());
});

client.on("error", (error) => {
  console.log(error);
});
