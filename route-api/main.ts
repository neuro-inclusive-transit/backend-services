import mqtt from "mqtt";
import _mariadb from "mariadb";
import { Application } from "oak/mod.ts";
import type { Context } from "oak/mod.ts";
import { GetRouteOptions, HereApiRouteData } from "./routes.ts";
import { aggregateData } from "./aggregateData.ts";
import { getRouteData } from "./getHereApiData.ts";

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

const MQTT_CLIENT = mqtt.connect(`mqtt://${BROKER_HOST}:${BROKER_PORT}`);

MQTT_CLIENT.on("connect", () => {
  MQTT_CLIENT.subscribe("presence", function (err) {
    if (!err) {
      MQTT_CLIENT.publish("presence", "Hello mqtt");
    }
  });
});

MQTT_CLIENT.on("message", (_, message) => {
  console.log(message.toString());
});

MQTT_CLIENT.on("error", (error) => {
  console.log(error);
});

const APP = new Application();

APP.use(async (ctx: Context) => {
  const origin = ctx.request.headers.get("origin");
  const destination = ctx.request.headers.get("destination");
  const arrivalTime = ctx.request.headers.get("arrivalTime");
  const departureTime = ctx.request.headers.get("departureTime");
  const lang = ctx.request.headers.get("lang");
  const units = ctx.request.headers.get("units");
  const changes = ctx.request.headers.get("changes");
  const alternatives = ctx.request.headers.get("alternatives");
  const modes = ctx.request.headers.get("modes");
  const pedestrianSpeed = ctx.request.headers.get("pedestrianSpeed");
  const returnData = ctx.request.headers.get("return");

  console.log("Origin " + origin);
  console.log("Destination " + destination);
  console.log("ArrivalTime " + arrivalTime);
  console.log("DepartureTime " + departureTime);
  console.log("Lang " + lang);
  console.log("Units " + units);
  console.log("Changes " + changes);
  console.log("Alternatives " + alternatives);
  console.log("Modes " + modes);
  console.log("PedestrianSpeed " + pedestrianSpeed);
  console.log("Return " + returnData);

  ctx.assert(origin !== null, 400, "Origin is wrong");
  ctx.assert(destination !== null, 400, "Destination is wrong");
  ctx.assert(
    arrivalTime !== null || departureTime !== null,
    400,
    "ArrivalTime or DepartureTime is wrong",
  );
  ctx.assert(lang !== undefined, 400, "Language is wrong");
  ctx.assert(units !== undefined, 400, "Units is wrong");
  ctx.assert(changes !== undefined, 400, "Changes is wrong");
  ctx.assert(alternatives !== undefined, 400, "Alternatives is wrong");
  ctx.assert(modes !== undefined, 400, "Modes is wrong");
  ctx.assert(pedestrianSpeed !== undefined, 400, "PedestrianSpeed is wrong");
  ctx.assert(returnData !== undefined, 400, "Return is wrong");

  const OPTIONS: GetRouteOptions = {
    origin,
    destination,
    arrivalTime: arrivalTime === null ? undefined : arrivalTime,
    departureTime: departureTime === null ? undefined : departureTime,
    lang: lang === null ? undefined : lang,
    units: units === null ? undefined : units,
    changes: changes === null ? undefined : parseInt(changes, 10),
    alternatives: alternatives === null
      ? undefined
      : parseInt(alternatives, 10),
    modes: modes === null ? undefined : modes,
    pedestrianSpeed: pedestrianSpeed === null
      ? undefined
      : parseInt(pedestrianSpeed, 10),
    return: returnData === null ? undefined : returnData,
  };

  const HERE_ROUTEDATA: HereApiRouteData = await getRouteData(
    OPTIONS,
    HERE_TRANSIT_API_KEY,
  );

  const RESPONSE_DATA: HereApiRouteData = await aggregateData(HERE_ROUTEDATA);

  ctx.response.body = RESPONSE_DATA;
});

await APP.listen({ port: PORT });
