import mqtt from "mqtt";
import mariadb from "mariadb";

const BROKER_HOST = Deno.env.get("BROKER_HOST") || "localhost";
const BROKER_PORT = Deno.env.get("BROKER_PORT") || "1883";

const DB_HOST = Deno.env.get("DB_HOST") || "localhost";
const DB_PORT = Deno.env.get("DB_PORT")
  ? parseInt(Deno.env.get("DB_PORT")!)
  : 3306;
const DB_USER = Deno.env.get("DB_USER") || "root";
const DB_PASSWORD = Deno.env.get("DB_PASSWORD") || "root";

const mqtt_client = mqtt.connect(`mqtt://${BROKER_HOST}:${BROKER_PORT}`);

mqtt_client.on("connect", () => {
  mqtt_client.subscribe("presence", function (err) {
    if (!err) {
      mqtt_client.publish("presence", "Hello mqtt");
    }
  });
});

mqtt_client.on("message", (_, message) => {
  console.log(message.toString());
});

mqtt_client.on("error", (error) => {
  console.log(error);
});
