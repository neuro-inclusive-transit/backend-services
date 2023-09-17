/**
 * Sends a request to the DB-Stations-API.
 *
 * @param DB_API_KEY The API key for the DB-Stations-API.
 * @param DB_CLIENT_ID The client ID for the DB-Stations-API.
 * @return The response from the DB-Stations-API.
 */

export async function getDBStationData(
  DB_API_KEY: string,
  DB_CLIENT_ID: string,
) {
  try {
    const RESPONSE = await fetch(
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
    return await RESPONSE.json();
  } catch (error) {
    console.log(error);
  }
}

/**
 * Sends a request to the DB-Timetable-API.
 *
 * @param DB_API_KEY The API key for the DB-Timetable-API.
 * @param DB_CLIENT_ID The client ID for the DB-Timetable-API.
 * @param evaNr The evaNr of the station.
 * @return The response from the DB-Timetable-API.
 */

export async function getDBTimetableData(
  DB_API_KEY: string,
  DB_CLIENT_ID: string,
  EVA_NR: string,
) {
  try {
    return await fetch(
      "https://apis.deutschebahn.com/db-api-marketplace/apis/timetables/v1/fchg/" +
        EVA_NR,
      {
        method: "GET",
        headers: {
          "DB-Api-Key": DB_API_KEY,
          "DB-Client-Id": DB_CLIENT_ID,
        },
      },
    );
  } catch (error) {
    console.log(error);
  }
}
