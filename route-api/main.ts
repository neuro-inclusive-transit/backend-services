import mqtt from "mqtt";
import _mariadb from "mariadb";
import { Application } from "oak/mod.ts";

const HERE_TRANSIT_API_KEY = Deno.env.get("HERE_TRANSIT_API");

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
};

const app = new Application();

// Request an Here-Transit-API
async function getRoute(options: GetRouteOptions, apiKey: string) {
  let anfrage = "https://transit.router.hereapi.com/v8/routes";

  /* Versuch, den Code zu verkürzen, indem die Parameter in einer for-Schleife abgearbeitet werden

  // Aktuelles Problem: Die Namen der Variablen sind über arguments[i] nicht abrufbar, weil es sich um ein Array handelt und dort die Variablennamen verloren gehen
  // Abrufen des Namens einer Variablen: Object.keys({ variable })[0];


  for (let i = 0; i < arguments.length; i++) {
    let option = arguments[i];
    let name =

    if (name == "apiKey" && apiKey != null) {
      anfrage += "?" + Object.keys({ name })[0] + "=" + option;
    }

    if (name != "apiKey" && option != null) {
      anfrage += "&" + Object.keys({ name })[0] + "=" + option;
    }
  }
  */

  if (apiKey != null) {
    anfrage += "?apiKey=" + apiKey;
  }
  if (options.origin != null) {
    anfrage += "&origin=" + options.origin;
  }
  if (options.arrivalTime != null) {
    anfrage += "&arrivalTime=" + options.arrivalTime;
  }
  if (options.destination != null) {
    anfrage += "&destination=" + options.destination;
  }
  if (options.departureTime != null) {
    anfrage += "&departureTime=" + options.departureTime;
  }
  if (options.lang != null) {
    anfrage += "&lang=" + options.lang;
  }
  if (options.units != null) {
    anfrage += "&units=" + options.units;
  }
  if (options.changes != null) {
    anfrage += "&changes=" + options.changes;
  }
  if (options.alternatives != null) {
    anfrage += "&alternatives=" + options.alternatives;
  }
  if (options.modes != null) {
    anfrage += "&modes=" + options.modes;
  }
  if (options.pedestrianSpeed != null) {
    anfrage += "&pedestrianSpeed=" + options.pedestrianSpeed;
  }

  console.log(anfrage);

  const response = await fetch(
    anfrage,
  );
  return await response.json();
}

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
  };

  const route = await getRoute(
    options,
    HERE_TRANSIT_API_KEY,
  );
  ctx.response.body = route;
});

await app.listen({ port: 3002 });
