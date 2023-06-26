export async function getDBStationData(
  DB_API_KEY: string,
  DB_CLIENT_ID: string,
) {
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

export async function getDBTimetableData(
  DB_API_KEY: string,
  DB_CLIENT_ID: string,
  evaNr: string,
) {
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
