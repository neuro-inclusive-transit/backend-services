import mqtt from "mqtt";
import { create } from "npm:xmlbuilder2";

const DB_API_KEY = Deno.env.get("DB_API_KEY") || "noKey";
const DB_CLIENT_ID = Deno.env.get("DB_CLIENT_ID") || "noKey";
const HERE_API_KEY = Deno.env.get("HERE_API_KEY") || "noKey";

const BROKER_HOST = Deno.env.get("BROKER_HOST") || "localhost";
const BROKER_PORT = Deno.env.get("BROKER_PORT") || "1883";

const PORT = Deno.env.get("PORT") ? parseInt(Deno.env.get("PORT")!) : 3306;

const client = mqtt.connect(`mqtt://${BROKER_HOST}:${BROKER_PORT}`);

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

const parseDate = (str, raw = false) => {
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

type Verspaetung = {
  evaNr: string;
  id: string;
  linie: string;
  arrivalTime: string | number | null;
  newarrivalTime: string | number | null;
};

async function getStationData() {
  console.log("Start getting data");
  const stationDatafromDB = await getDBStationData();
  console.log("Got Data from DB");
  const stations = await minimizeData(stationDatafromDB);

  stations.forEach(async (station) => {
    const timeTableData = await getDBTimetableData(station.evaNr);
    parseandpublishTimetableData(timeTableData);
  });
}

function minimizeData(stations: any) {
  const newstations: Station[] = [];

  if (stations && stations.result) {
    stations.result.forEach((station: any) => {
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

async function getDBStationData() {
  const response = await fetch(
    "https://apis.deutschebahn.com/db-api-marketplace/apis/station-data/v2/stations",
    {
      method: "GET",
      headers: {
        "DB-Api-Key": DB_API_KEY,
        "DB-Client-Id": DB_CLIENT_ID,
        accept: "application/json",
      },
    },
  );
  return await response.json();
}

async function getDBTimetableData(evaNr: string) {
  return await fetch(
    "https://apis.deutschebahn.com/db-api-marketplace/apis/timetables/v1/fchg/" +
      evaNr,
    {
      method: "GET",
      headers: {
        "DB-Api-Key": DB_API_KEY,
        "DB-Client-Id": DB_CLIENT_ID,
      },
    },
  );
}

async function parseandpublishTimetableData(data: any) {
  const xml = create(await data.text()).end({ format: "object" });

  xml.timetable.s.map((i) => {
    let temp = "ID: " + i["@id"];

    const ardp = (j) => {
      const Verspaetung: Verspaetung = {
        linie: j["@l"],
        id: i["@id"],
        evaNr: xml.timetable["@eva"],
        arrivalTime: parseDate(j["@pt"]),
        newarrivalTime: parseDate(j["@ct"]),
      };
      if (Verspaetung.linie != undefined && Verspaetung.linie.startsWith("S")) {
        Verspaetung.linie = Verspaetung.linie.substring(1);
      }

      if (
        Verspaetung.linie != undefined && Verspaetung.linie.startsWith("RB")
      ) {
        Verspaetung.linie = Verspaetung.linie.substring(2);
      }
      if (
        Verspaetung.linie != undefined && Verspaetung.newarrivalTime != null
      ) publishVerspaetung(Verspaetung);
    };
    if (i.ar) temp += "; Ankunft: " + ardp(i.ar);
  });
}

async function publishVerspaetung(data: Verspaetung) {
  subscribeEvaNr(data.evaNr);

  await client.publish(
    data.evaNr + "/" + data.linie,
    "newarrivalTime:" + data.newarrivalTime,
  );
}

async function subscribeEvaNr(evaNr: string) {
  await client.subscribe(evaNr + "/#");
}

getStationData();
setInterval(getStationData, 5 * 60 * 1000);
