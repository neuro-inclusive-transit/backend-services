import mqtt from "mqtt";
import _mariadb from "mariadb";
import { Application } from "oak/mod.ts";

const HERE_TRANSIT_API_KEY = Deno.env.get("HERE_TRANSIT_API") || "nokey";

const PORT = Deno.env.get("PORT") ? parseInt(Deno.env.get("PORT")!) : 3306;

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

type GetRouteOptions = {
  origin: string;
  destination: string;
  arrivalTime?: string;
  departureTime?: string;
  lang?: string;
  units?: string;
  changes?: number;
  alternatives?: number;
  modes?: string[];
  pedestrianSpeed?: number;
  return?: string;
};

const app = new Application();

app.use(async (ctx) => {
  // Header aus Get-Request ablesen
  const options: GetRouteOptions = {
    origin: ctx.request.headers.get("origin"),
    destination: ctx.request.headers.get("destination"),
    arrivalTime: ctx.request.headers.get("arrivalTime"),
    departureTime: ctx.request.headers.get("departureTime"),
    lang: ctx.request.headers.get("lang"),
    units: ctx.request.headers.get("units"),
    changes: ctx.request.headers.get("changes"),
    alternatives: ctx.request.headers.get("alternatives"),
    modes: ctx.request.headers.get("modes"),
    pedestrianSpeed: ctx.request.headers.get("pedestrianSpeed"),
    return: ctx.request.headers.get("return"),
  };

  const route = await getRoute(
    options,
    HERE_TRANSIT_API_KEY,
  );
  ctx.response.body = route;
});

await app.listen({ port: PORT });

async function getRoute(options: GetRouteOptions, apiKey: string) {
  const optionsAsString = changeObjectToString(options);
  const url = generateURL(optionsAsString, apiKey);
  const route = await sendRequest(url);
  return route.json();
}

function changeObjectToString(object: GetRouteOptions) {
  const objectWithoutNull = Object.entries(object).filter(
    ([_, value]) => value != null,
  );
  const objectWithString = objectWithoutNull.map(([key, value]) => {
    return [key, `${value}`];
  });
  return objectWithString;
}

function generateURL(options, apiKey: string) {
  const params = new URLSearchParams(options);

  const url = new URL(
    "https://transit.router.hereapi.com/v8/routes?apiKey=" + apiKey + "&" +
      params.toString(),
  );
  return url;
}

async function sendRequest(url: URL) {
  return await fetch(url);
}
