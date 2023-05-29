// --- Lesen der Keys aus der .env ---
async function loadEnvVariables(): Promise<Map<string, string>> {
  const envVariables = new Map<string, string>();

  const envData = await Deno.readTextFile("../../.env");
  const lines = envData.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine !== "") {
      const [key, value] = trimmedLine.split("=");
      envVariables.set(key.trim(), value.trim());
    }
  }

  return envVariables;
}
// --- ---

const envVariables = await loadEnvVariables();
const DB_API_KEY = envVariables.get("DB_API_KEY")?.toString() || "noKey";
const DB_CLIENT_ID = envVariables.get("DB_CLIENT_ID")?.toString() || "noKey";

type Station = {
  name: string;
  evaNr: string | null;
  hereID: string | null;
};

const stationDatafromDB = await getDBStationData();
const stations: Station[] = [];

if (stationDatafromDB && stationDatafromDB.result) {
  stationDatafromDB.result.forEach((station: any) => {
    if (
      station.mailingAddress.zipcode.startsWith("50") ||
      station.mailingAddress.zipcode.startsWith("51")
    ) {
      const tmp: Station = {
        name: station.name,
        evaNr: station.evaNumbers[0].number,
        hereID: null,
      };

      stations.push(tmp);
    }
  });
} else {
  console.error("Fehler beim Abrufen der Daten von der Datenbank");
}

Deno.writeTextFile("./stationData.json", JSON.stringify(stations));

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
