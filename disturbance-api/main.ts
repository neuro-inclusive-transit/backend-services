import mqtt from "mqtt";
import { Application } from "oak/mod.ts";

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

type Station = {
  name: string;
  evaNr: string | null;
};

async function getStationData() {
  try {
    console.log("Start getting data");
    const stationDatafromDB = await getDBStationData();
    console.log("Got Data from DB");
    const stations = await minimizeData(stationDatafromDB);
    console.log(stations);
  } catch (error) {
    console.error("Error retrieving station data:", error);
  }
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
  const data = await response.json();
  return data;
}

getStationData();
