import mqtt from "mqtt";

const BROKER_HOST = Deno.env.get("BROKER_HOST") || "localhost";
const BROKER_PORT = Deno.env.get("BROKER_PORT") || "1883";
const BROKER_USERNAME = Deno.env.get("BROKER_USERNAME") || "noUser";
const BROKER_PASSWORD = Deno.env.get("BROKER_PASSWORD") || "noPassword";

const CLIENT = mqtt.connect({
  host: BROKER_HOST,
  port: BROKER_PORT,
  password: BROKER_PASSWORD,
  username: BROKER_USERNAME,
});

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
