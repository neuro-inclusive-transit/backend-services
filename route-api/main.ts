import mqtt from "mqtt";
import _mariadb from "mariadb";
import { Application } from "oak";

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

const app = new Application();

// Request an Here-Transit-API
async function getRoute(
  origin,
  destination,
  arrivalTime,
  departureTime,
  lang,
  units,
  changes,
  alternatives,
  modes,
  pedestrianSpeed,
  apiKey,
) {
  let anfrage = "https://transit.router.hereapi.com/v8/routes";

  console.log(arguments);

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
  if (origin != null) {
    anfrage += "&origin=" + origin;
  }
  if (arrivalTime != null) {
    anfrage += "&arrivalTime=" + arrivalTime;
  }
  if (destination != null) {
    anfrage += "&destination=" + destination;
  }
  if (departureTime != null) {
    anfrage += "&departureTime=" + departureTime;
  }
  if (lang != null) {
    anfrage += "&lang=" + lang;
  }
  if (units != null) {
    anfrage += "&units=" + units;
  }
  if (changes != null) {
    anfrage += "&changes=" + changes;
  }
  if (alternatives != null) {
    anfrage += "&alternatives=" + alternatives;
  }
  if (modes != null) {
    anfrage += "&modes=" + modes;
  }
  if (pedestrianSpeed != null) {
    anfrage += "&pedestrianSpeed=" + pedestrianSpeed;
  }

  const response = await fetch(
    anfrage,
  );
  return await response.json();
}

app.use(async (ctx) => {
  // Header aus Get-Request ablesen
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

  const route = await getRoute(
    origin,
    destination,
    arrivalTime,
    departureTime,
    lang,
    units,
    changes,
    alternatives,
    modes,
    pedestrianSpeed,
    hereTransitAPIKey,
  );
  ctx.response.body = route;
});

await app.listen({ port: 3002 });
