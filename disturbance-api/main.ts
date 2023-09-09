import mqtt from "mqtt";
import { create } from "npm:xmlbuilder2";
import { Application, Router, Status } from "oak/mod.ts";
import type { Context } from "oak/mod.ts";
import { getDBStationData, getDBTimetableData } from "./getApiData.ts";

const DB_API_KEY = Deno.env.get("DB_API_KEY") || "noKey";
const DB_CLIENT_ID = Deno.env.get("DB_CLIENT_ID") || "noKey";

const BROKER_HOST = Deno.env.get("BROKER_HOST") || "localhost";
const BROKER_PORT = Deno.env.get("BROKER_PORT") || "1883";

const PORT = Deno.env.get("PORT") ? parseInt(Deno.env.get("PORT")!) : 80;

const client = mqtt.connect(`mqtt://${BROKER_HOST}:${BROKER_PORT}`);

const router = new Router();

router.get("/stations", (ctx: Context) => {
  const station = ctx.request.url.searchParams.get("station");
  console.log(station);
  ctx.assert(typeof station === "string", Status.BadRequest);

  const stationData = stations.find((dataset) => dataset.name === station);

  ctx.assert(stationData !== undefined, Status.NotFound);

  ctx.response.body = stationData;
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: PORT });

client.on("connect", () => {
  client.subscribe("presence", function (err) {
    if (!err) {
      client.publish("presence", "Hello mqtt");
    }
  });
});

client.on("message", (topic, payload) => {
  console.log(topic, payload.toString());
});

client.on("error", (error) => {
  console.log(error);
});

const parseDate = (str: string, raw = false) => {
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

type Delay = {
  evaNr: string;
  id: string;
  linie: string;
  arrivalTime: string | number | null;
  newarrivalTime: string | number | null;
};

console.log("Start getting data");
const stationDatafromDB = await getDBStationData(DB_API_KEY, DB_CLIENT_ID);
console.log("Got Data from DB");
const stations = await minimizeData(stationDatafromDB);

getTimeTableDataAndPublish(stations);

setInterval(() => {
  getTimeTableDataAndPublish(stations);
}, 5 * 60 * 1000);

function getTimeTableDataAndPublish(stations: Station[]) {
  stations.forEach(async (station) => {
    const timeTableData = await getDBTimetableData(
      DB_API_KEY,
      DB_CLIENT_ID,
      station.evaNr,
    );
    parseandpublishTimetableData(timeTableData);
  });

  stations.forEach(async (station) => {
    const timeTableData = await getDBTimetableData(
      DB_API_KEY,
      DB_CLIENT_ID,
      station.evaNr,
    );
    parseandpublishTimetableData(timeTableData);
  });
}

function minimizeData(stations: unknown) {
  const newstations: Station[] = [];

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

        newstations.push(tmp);
      }
    });
  }
  return newstations;
}

async function parseandpublishTimetableData(data: unknown) {
  const xml = create(await data.text()).end({ format: "object" });

  try {
    xml.timetable.s.map((i) => {
      let temp = "ID: " + i["@id"];

      const ardp = (j) => {
        const delay: Delay = {
          linie: j["@l"],
          id: i["@id"],
          evaNr: xml.timetable["@eva"],
          arrivalTime: parseDate(j["@pt"]),
          newarrivalTime: parseDate(j["@ct"]),
        };
        if (delay.linie != undefined && delay.linie.startsWith("S")) {
          delay.linie = delay.linie.substring(1);
        }
        if (
          delay.linie != undefined && delay.linie.startsWith("RB")
        ) {
          delay.linie = delay.linie.substring(2);
        }
        if (
          delay.linie != undefined && delay.newarrivalTime != null
        ) publishDelay(delay);
      };
      if (i.ar) temp += "; Ankunft: " + ardp(i.ar);
    });
  } catch {
    console.error("Error parsing xml from timetablesAPI");
  }
}

async function publishDelay(data: Delay) {
  await client.publish(
    data.evaNr + "/" + data.linie,
    "newarrivalTime:" + data.newarrivalTime,
  );
}
