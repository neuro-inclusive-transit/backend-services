const DB_API_KEY = "";
const DB_CLIENT_ID = "";

async function getStationData() {
  const response = await fetch(
    "https://apis.deutschebahn.com/db-api-marketplace/apis/station-data/v2/stations",
    {
      method: "GET",
      headers: {
        "DB-Api-Key": DB_API_KEY,
        "DB-Client-Id": DB_CLIENT_ID,
        "accept": "application/json",
      },
    },
  );
  const data = await response.json();
  return data;
}

Deno.writeTextFile(
  "./stationData.json",
  JSON.stringify(await getStationData()),
);
