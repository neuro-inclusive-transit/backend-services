import mqtt from "mqtt";
import { create } from "npm:xmlbuilder2";
import { Application, Router, Status } from "oak/mod.ts";
import type { Context } from "oak/mod.ts";
import { getDBStationData, getDBTimetableData } from "./getApiData.ts";

const DB_API_KEY = Deno.env.get("DB_API_KEY") || "noKey";
const DB_CLIENT_ID = Deno.env.get("DB_CLIENT_ID") || "noKey";

const BROKER_HOST = Deno.env.get("BROKER_HOST") || "localhost";
const BROKER_PORT = Deno.env.get("BROKER_PORT") || "1883";
const BROKER_USERNAME = Deno.env.get("BROKER_USERNAME") || "noUser";
const BROKER_PASSWORD = Deno.env.get("BROKER_PASSWORD") || "noPassword";

const PORT = Deno.env.get("PORT") ? parseInt(Deno.env.get("PORT")!) : 80;

const CLIENT = mqtt.connect({
  host: BROKER_HOST,
  port: BROKER_PORT,
  password: BROKER_PASSWORD,
  username: BROKER_USERNAME,
});

const ROUTER = new Router();

ROUTER.get("/stations", (ctx: Context) => {
  const STATION = ctx.request.url.searchParams.get("station");
  console.log(STATION);
  ctx.assert(typeof STATION === "string", Status.BadRequest);

  const STATION_DATA = STATIONS.find((dataset) => dataset.name === STATION);

  ctx.assert(STATION_DATA !== undefined, Status.NotFound);

  ctx.response.body = STATION_DATA;
});

const APP = new Application();
APP.use(ROUTER.routes());
APP.use(ROUTER.allowedMethods());

APP.listen({ port: PORT });

CLIENT.on("connect", () => {
  CLIENT.subscribe("presence", function (err) {
    if (!err) {
      CLIENT.publish("presence", "Hello mqtt");
    }
  });
});

CLIENT.on("message", (topic, payload) => {
  console.log(topic, payload.toString());
});

CLIENT.on("error", (error) => {
  console.log(error);
});

const PARSE_DATE = (str: string, raw = false) => {
  if (str == undefined) return null;

  const date = str.substr(0, 6);
  const time = str.substr(6, 4);
  const d = new Date();
  d.setFullYear(parseInt(date.substr(0, 2)) + 2000);
  d.setMonth(parseInt(date.substr(2, 2)) - 1);
  d.setDate(parseInt(date.substr(4, 2)));
  d.setHours(parseInt(time.substr(0, 2)));
  d.setMinutes(parseInt(time.substr(2, 2)));
  d.setSeconds(0);

  if (raw) return d.getTime();
  return d.toLocaleString("de-DE", { timeFormat: "short" });
};

type Station = {
  name: string;
  evaNr: string;
};

type DELAY = {
  evaNr: string;
  id: string;
  linie: string;
  arrivalTime: string | number | null;
  newarrivalTime: string | number | null;
};

console.log("Start getting data");
const STAION_DATA_FROM_DB = await getDBStationData(DB_API_KEY, DB_CLIENT_ID);
console.log("Got Data from DB");
const STATIONS = await minimizeData(STAION_DATA_FROM_DB);

getTimeTableDataAndPublish(STATIONS);

setInterval(() => {
  getTimeTableDataAndPublish(STATIONS);
}, 5 * 60 * 1000);

/**
 * Calls function for requesting data from the API and publishing it to the broker.
 *
 * @param stations Array of stations to request data from.
 */

function getTimeTableDataAndPublish(stations: Station[]) {
  stations.forEach(async (station) => {
    const timeTableData = await getDBTimetableData(
      DB_API_KEY,
      DB_CLIENT_ID,
      station.evaNr,
    );
    parseandpublishTimetableData(timeTableData);
  });
}

/**
 * Minimalizes number of station to reduce data.
 *
 * @param stations Array of stations to reduce.
 * @return Array with reduced stations.
 */

function minimizeData(stations: unknown) {
  const NEWSTATIONS: Station[] = [];

  if (stations && stations.result) {
    stations.result.forEach((station: unknown) => {
      if (
        station.mailingAddress.zipcode.startsWith("50") ||
        station.mailingAddress.zipcode.startsWith("51")
      ) {
        const tmp: Station = {
          name: station.name,
          evaNr: station.evaNumbers[0]?.number || null,
        };

        NEWSTATIONS.push(tmp);
      }
    });
  }
  return NEWSTATIONS;
}

/**
 * Parses the xml from the timetableAPI and publishes the data to the broker.
 * Parts of this function are taken from:
 * https://gist.github.com/DEVTomatoCake/e18d870381f22c17bf25d738510c8d1c
 *
 * @param data Data from the timetableAPI.
 */

async function parseandpublishTimetableData(data: unknown) {
  const XML = create(await data.text()).end({ format: "object" });

  try {
    XML.timetable.s.map((i) => {
      let temp = "ID: " + i["@id"];

      const ARDP = (j) => {
        const DELAY: DELAY = {
          linie: j["@l"],
          id: i["@id"],
          evaNr: XML.timetable["@eva"],
          arrivalTime: PARSE_DATE(j["@pt"]),
          newarrivalTime: PARSE_DATE(j["@ct"]),
        };
        if (DELAY.linie != undefined && DELAY.linie.startsWith("S")) {
          DELAY.linie = DELAY.linie.substring(1);
        }
        if (
          DELAY.linie != undefined && DELAY.linie.startsWith("RB")
        ) {
          DELAY.linie = DELAY.linie.substring(2);
        }
        if (
          DELAY.linie != undefined && DELAY.newarrivalTime != null
        ) publishDELAY(DELAY);
      };
      if (i.ar) temp += "; Ankunft: " + ARDP(i.ar);
    });
  } catch {
    console.error("Error parsing xml from timetablesAPI");
  }
}

/**
 * Publish DELAY of a train to the broker.
 *
 * @param data DELAY of a train.
 */

async function publishDELAY(data: DELAY) {
  await CLIENT.publish(
    data.evaNr + "/" + data.linie,
    "newarrivalTime:" + data.newarrivalTime,
  );
}
