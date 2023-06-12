import mqtt from "mqtt";
import { Application } from "oak/mod.ts";
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

client.on("message", (_, message) => {
  console.log(message.toString());
});

client.on("error", (error) => {
  console.log(error);
});

const messageTypes = {
  h: "HIM (generiert von Hafas Information Manager)",
  q: "Qualitätsänderung",
  f: "Freitext",
  d: "Verspätung",
  i: "IBIS (generiert durch IRIS-AP)",
  u: "IBIS (generiert durch IRIS-AP), noch nicht mit Zug verbunden",
  r: "Ausfall",
  c: "Verbindung/Connection",
};
const priorityTypes = {
  1: "HIGH",
  2: "MEDIUM",
  3: "LOW",
  4: "DONE",
};
const eventStatusTypes = {
  p: "Ereignis geplant",
  a: "Ereignis als neuer Halt hinzugefügt",
  c: "Ereignis abgebrochen",
};
const stats = {
  MeldungenPrioritaet: {},
  AenderungsTyp: {},
};

const parseDate = (str, raw = false) => {
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

async function getStationData() {
  console.log("Start getting data");
  const stationDatafromDB = await getDBStationData();
  console.log("Got Data from DB");
  const stations = await minimizeData(stationDatafromDB);

  stations.forEach(async (station) => {
    const timeTableData = await getDBTimetableData(station.evaNr);
    parseTimetableData(timeTableData);
  });
}

function minimizeData(stations: any) {
  const newstations: Station[] = [];

  if (stations && stations.result) {
    stations.result.forEach((station: any) => {
      if (
        station.mailingAddress.zipcode.startsWith("50127") ||
        station.mailingAddress.zipcode.startsWith("50127")
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

async function parseTimetableData(data: any) {
  const xml = create(await data.text()).end({ format: "object" });
  stats.MeldungenAnzahl = xml.timetable.s.length;

  const handleNachricht = (m, hideTime = false) => {
    if (!Array.isArray(m)) m = [m];
    return "Meldung: " + m.map((msg) => {
      if (msg["@pr"]) {
        stats.MeldungenPrioritaet[priorityTypes[msg["@pr"]]] =
          (stats.MeldungenPrioritaet[priorityTypes[msg["@pr"]]] || 0) + 1;
      }
      return "ID: " + msg["@id"] +
        (!hideTime ? ", veröffentlicht: " + parseDate(msg["@ts"]) : "") +
        ", Typ: " + messageTypes[msg["@t"]] +
        (msg["@from"] && !hideTime
          ? ", gültig ab: " + parseDate(msg["@from"])
          : "") +
        (msg["@to"] && !hideTime ? ", bis: " + parseDate(msg["@to"]) : "") +
        (msg["@cat"] ? ", Kategorie: " + msg["@cat"] : "") +
        (msg["@pr"] ? ", Priorität: " + priorityTypes[msg["@pr"]] : "");
    }).join("; ");
  };

  const meldung = xml.timetable.s.map((i) => {
    let temp = "ID: " + i["@id"];
    const ardp = (j, typ) => {
      return (j["@l"] ? "Linie: " + j["@l"] : "") +
        (j["@ct"]
          ? (j["@l"] ? ", " : "") + "geänderte " + typ + "szeit: " +
            parseDate(j["@ct"])
          : "") +
        (j["@pt"] ? ", " + typ + "szeit geplant: " + parseDate(j["@pt"]) : "") +
        (j["@cp"] ? ", geänderter Bahnsteig: " + j["@cp"] : "") +
        (j["@pp"] ? ", Bahnsteig geplant: " + j["@pp"] : "") +
        (j["@cpth"] ? ", geänderte Route: " + j["@cpth"] : "") +
        (j["@ppth"] ? ", Route geplant: " + j["@ppth"] : "") +
        (j["@cs"] ? ", Änderungsstatus: " + eventStatusTypes[j["@cs"]] : "") +
        (j["@clt"] ? ", Halt entfernt um: " + parseDate(j["@clt"]) : "") +
        (j.m ? ", " + handleNachricht(j.m) : "");
    };

    if (i.ar) temp += "; Ankunft: " + ardp(i.ar, "Ankunft");
    if (i.dp) temp += "; Abfahrt: " + ardp(i.dp, "Abfahrt");
    if (i.tl) {
      temp += "; Zug: " + i.tl["@c"] + " " + i.tl["@n"] + ", Filter: " +
        i.tl["@f"] + ", Besitzer: " + i.tl["@o"] + ", Typ: " + i.tl["@t"];
    }
    if (i.m) temp += "; " + handleNachricht(i.m);
    return temp;
  }).join("\n");

  console.log(
    "Bahnhof: " + xml.timetable["@station"] + " (" + xml.timetable["@eva"] +
      ")" +
      (xml.timetable.m ? ", " + handleNachricht(xml.timetable.m, true) : ""),
  );
  console.log(meldung);
}

getStationData();
