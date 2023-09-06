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
  modes?: string;
  pedestrianSpeed?: number;
  return?: string;
};

const app = new Application();

app.use(async (ctx) => {
  ctx.assert(
    typeof ctx.request.headers.get("changes") !== "number",
    400,
    "Changes is not a number",
  );
  ctx.assert(
    typeof ctx.request.headers.get("alternatives") !== "number",
    400,
    "Alternatives is not a number",
  );
  ctx.assert(
    typeof ctx.request.headers.get("pedestrianSpeed") !== "number",
    400,
    "PedestrianSpeed is not a number",
  );

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

  const hereRouteData = await getRouteData(options, HERE_TRANSIT_API_KEY);

  const responseData = aggregateData(hereRouteData);

  ctx.response.body = responseData;
});

await app.listen({ port: PORT });

/**
 * Calls main functions for getting data from the HereAPI.
 *
 * @param apiKey The API key for the HereAPI.
 * @param options The options for the Route.
 * @return Route-data from the HereAPI.
 */

async function getRouteData(options: GetRouteOptions, apiKey: string) {
  const optionsAsString = changeObjectToString(options);
  const url = generateURL(optionsAsString, apiKey);
  const route = await sendAPIRequest(url);
  return route.json();
}

/**
 * Takes GetRouteOptions and converts it to a string.
 *
 * @param object RouteOptions-Object for the Route.
 * @return GetRouteOptions as a string.
 */

function changeObjectToString(object: GetRouteOptions) {
  const objectWithoutNull = Object.entries(object).filter(
    ([_, value]) => value != null,
  );
  const objectWithString = objectWithoutNull.map(([key, value]) => {
    return [key, `${value}`];
  });
  return objectWithString;
}

/**
 * Generates the URL for the HereAPI.
 *
 * @param options The options for the Route as a string.
 * @return URL for the HereAPI.
 */

function generateURL(options: string, apiKey: string) {
  const params = new URLSearchParams(options);

  const url = new URL(
    "https://transit.router.hereapi.com/v8/routes?apiKey=" + apiKey + "&" +
      params.toString(),
  );
  return url;
}

async function sendAPIRequest(url: URL) {
  return await fetch(url);
}

function aggregateData(hereRouteData: GetRouteOptions) {
  // TODO: Daten mit anderen Infos aggregieren

  const aggregatedData = hereRouteData;

  return aggregatedData;
}
