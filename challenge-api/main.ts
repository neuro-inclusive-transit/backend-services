import mqtt from "mqtt";

const BROKER_HOST = Deno.env.get("BROKER_HOST") || "localhost";
const BROKER_PORT = Deno.env.get("BROKER_PORT") || "1883";

const CLIENT = mqtt.connect(`mqtt://${BROKER_HOST}:${BROKER_PORT}`);

CLIENT.on("connect", () => {
  CLIENT.subscribe("presence", function (err) {
    if (!err) {
      CLIENT.publish("presence", "Hello mqtt");
    }
  });
});

CLIENT.on("message", (_, message) => {
  console.log(message.toString());
});

CLIENT.on("error", (error) => {
  console.log(error);
});
