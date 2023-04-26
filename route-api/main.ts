import mqtt from "mqtt";
import _mariadb from "mariadb";
import { Application } from "oak";

const hereTransitAPIKey = Deno.env.get("HERETRANSITAPI");

const BROKER_HOST = Deno.env.get("BROKER_HOST") || "localhost";
const BROKER_PORT = Deno.env.get("BROKER_PORT") || "1883";

const _DB_HOST = Deno.env.get("DB_HOST") || "localhost";
const _DB_PORT = Deno.env.get("DB_PORT")
  ? parseInt(Deno.env.get("DB_PORT")!)
  : 3306;
const _DB_USER = Deno.env.get("DB_USER") || "root";
const _DB_PASSWORD = Deno.env.get("DB_PASSWORD") || "root";

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

const app = new Application();

// Request an Here-Transit-API
async function getRoute(origin, destination, arrivalTime, apiKey) {
  const response = await fetch(
    "https://transit.router.hereapi.com/v8/routes?apiKey=" + apiKey +
      "&origin=" + origin + "&destination=" + destination + "&arrivalTime=" +
      arrivalTime,
  );
  return await response.json();
}

app.use(async (ctx) => {
  // Header aus Get-Request ablesen
  const origin = ctx.request.headers.get("origin");
  const destination = ctx.request.headers.get("destination");
  const arrivalTime = ctx.request.headers.get("arrivalTime");

  const route = await getRoute(
    origin,
    destination,
    arrivalTime,
    hereTransitAPIKey,
  );
  ctx.response.body = route;
});

await app.listen({ port: 3002 });
