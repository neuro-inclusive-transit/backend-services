import mqtt from "mqtt";
import _mariadb from "mariadb";
import { Application, Status } from "oak/mod.ts";
import type { Context } from "oak/mod.ts";

const HERE_TRANSIT_API_KEY = Deno.env.get("HERE_TRANSIT_API") || "nokey";

const PORT = Deno.env.get("PORT") ? parseInt(Deno.env.get("PORT")!) : 3306;

const BROKER_HOST = Deno.env.get("BROKER_HOST") || "localhost";
const BROKER_PORT = Deno.env.get("BROKER_PORT") || "1883";

const DISTURBANCE_HOST = Deno.env.get("DISTURBANCE_HOST") || "localhost";
const DISTURBANCE_PORT = Deno.env.get("DISTURBANCE_PORT") || "3001";

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

type LatLng = {
  lat: number;
  lng: number;
};

type Place = {
  id?: string;
  name?: string;
  type: string;
  evaNr?: string;
  location: LatLng;
};

type TimeAndPlace = {
  time: string;
  place: Place;
  delay?: number;
};

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

// @see https://developer.here.com/documentation/intermodal-routing/dev_guide/concepts/modes.html
export type HereApiTransportMode =
  | "highSpeedTrain"
  | "intercityTrain"
  | "interRegionalTrain"
  | "regionalTrain"
  | "cityTrain"
  | "bus"
  | "ferry"
  | "subway"
  | "lightRail"
  | "privateBus"
  | "inclined"
  | "aerial"
  | "busRapid"
  | "monorail"
  | "flight"
  | "walk"
  | "car"
  | "bicycle"
  | "pedestrian"
  | string;

type HereApiRoute = {
  id: string;
  sections: Array<{
    id: string;
    type: string;
    departure: TimeAndPlace;
    arrival: TimeAndPlace;
    summary?: {
      duration: number;
      length: number;
    };
    actions?: Array<{
      action: string;
      duration: number;
      instruction: string;
      direction?: string;
      severity?: string;
      offset?: number;
      exit?: number;
    }>;
    polyline?: string;
    spans?: Array<{
      offset: number;
      names: Array<{
        value: string;
        language: string;
      }>;
    }>;
    transport: {
      mode: HereApiTransportMode;
      name?: string;
      category?: string;
      color?: string;
      textColor?: string;
      headsign?: string;
      shortName?: string;
    };
    intermediateStops?: Array<{
      departure: TimeAndPlace;
      duration?: number;
    }>;
    agency?: {
      id: string;
      name: string;
      website: string;
    };
  }>;
  agency?: {
    id: string;
    name: string;
    website: string;
  };
};

const app = new Application();

app.use(async (ctx: Context) => {
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

  const options: GetRouteOptions = {
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

  const hereRouteData: HereApiRoute = await getRouteData(
    options,
    HERE_TRANSIT_API_KEY,
  );

  const responseData: HereApiRoute = aggregateData(hereRouteData); // Aggregated typ

  ctx.response.body = responseData;
});

await app.listen({ port: PORT });

async function getRouteData(options: GetRouteOptions, apiKey: string) {
  const optionsAsString = changeObjectToString(options);
  const url = generateHereApiURL(optionsAsString, apiKey);
  const route = await sendAPIRequest(url);
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

function generateHereApiURL(options, apiKey?: string) {
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

function aggregateData(hereRouteData: HereApiRoute) {
  const aggregatedData = hereRouteData;

  aggregatedData.routes.forEach((element) => {
    element.sections.forEach(async (section) => {
      if (section.departure.place.type === "station") {
        if (section.departure.place.name !== undefined) {
          const response = await fetch(
            generateDisturbanceApiURL(section.departure.place.name),
          );
          console.log(response.statusText);
        }
      }
    });
  });

  return aggregatedData;
}

function generateDisturbanceApiURL(station: string) {
  const url = new URL(
    "http://" + DISTURBANCE_HOST + ":" + DISTURBANCE_PORT +
      "/stations?station=" + station,
  );

  return url;
}
