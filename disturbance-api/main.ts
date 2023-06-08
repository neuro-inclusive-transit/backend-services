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

async function minimizeData(stations: any): Promise<Station[]> {
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
      if (typ == "Ankunft" && (j["@ct"] || j["@pt"])) {
        stats.AnkunftszeitGeaendert = (stats.AnkunftszeitGeaendert || 0) + 1;
      }
      if (typ == "Abfahrt" && (j["@ct"] || j["@pt"])) {
        stats
          .AbfahrtszeitGeaendert = (stats.AbfahrtszeitGeaendert || 0) + 1;
      }
      if (j["@cp"] || j["@pp"]) {
        stats.BahnsteigGeaendert = (stats.BahnsteigGeaendert || 0) + 1;
      }
      if (j["@cpth"] || j["@ppth"]) {
        stats.RouteGeaendert = (stats.RouteGeaendert || 0) + 1;
      }
      if (j["@clt"]) stats.HaltEntfernt = (stats.HaltEntfernt || 0) + 1;
      if (j["@cs"]) {
        stats.AenderungsTyp[eventStatusTypes[j["@cs"]]] =
          (stats.AenderungsTyp[eventStatusTypes[j["@cs"]]] || 0) + 1;
      }

      if (j["@ct"] && j["@pt"]) {
        if (parseDate(j["@ct"], true) >= parseDate(j["@pt"], true)) {
          stats.ZugSpaeter = (stats.ZugSpaeter || 0) + 1;
          stats.ZugSpaeterUmMs = (stats.ZugSpaeterUmMs || 0) +
            parseDate(j["@ct"], true) - parseDate(j["@pt"], true);
          stats.ZugSpaeterUmH = 0;
          stats.ZugSpaeterDurchschnittH = 0;
        } else {
          stats.ZugFrueher = (stats.ZugFrueher || 0) + 1;
          stats.ZugFrueherUmMs = (stats.ZugFrueherUmMs || 0) +
            parseDate(j["@pt"], true) - parseDate(j["@ct"], true);
          stats.ZugFrueherUmH = 0;
          stats.ZugFrueherDurchschnittH = 0;
        }
      }

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

  console.log(meldung);

  if (stats.ZugFrueherUmMs > 5000000) {
    stats.ZugFrueherUmH = stats.ZugFrueherUmMs / 1000 / 60 / 60;
    stats.ZugFrueherDurchschnittH = stats.ZugFrueherUmH / stats.ZugFrueher;
  } else {
    stats.ZugFrueherUmMin = stats.ZugFrueherUmMs / 1000 / 60;
    stats.ZugFrueherDurchschnittMin = stats.ZugFrueherUmMin / stats.ZugFrueher;
  }
  if (stats.ZugSpaeterUmMs > 5000000) {
    stats.ZugSpaeterUmH = stats.ZugSpaeterUmMs / 1000 / 60 / 60;
    stats.ZugSpaeterDurchschnittH = stats.ZugSpaeterUmH / stats.ZugSpaeter;
  } else {
    stats.ZugSpaeterUmMin = stats.ZugSpaeterUmMs / 1000 / 60 / 60;
    stats.ZugSpaeterDurchschnittMin = stats.ZugSpaeterUmMin / stats.ZugSpaeter;
  }

  console.log(
    "Bahnhof: " + xml.timetable["@station"] + " (" + xml.timetable["@eva"] +
      ")" +
      (xml.timetable.m ? ", " + handleNachricht(xml.timetable.m, true) : ""),
  );
  //console.log(stats);
}

getStationData();
