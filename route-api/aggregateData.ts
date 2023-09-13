import { HereApiRouteData } from "./routes.ts";

const DISTURBANCE_HOST = Deno.env.get("DISTURBANCE_HOST") || "localhost";
const DISTURBANCE_PORT = Deno.env.get("DISTURBANCE_PORT") || "3001";

/**
 * Aggregate data from HereAPI with evaNr from DB
 *
 * @param hereRouteData The Route-data from the HereAPI.
 * @return Aggregated Route-data with evaNr.
 */

export async function aggregateData(hereRouteData: HereApiRouteData) {
  const aggregatedData = hereRouteData;

  await Promise.all(
    aggregatedData.routes.map((element) => {
      return element.sections.map((section) => {
        if (section.departure.place.type === "station") {
          if (section.departure.place.name !== undefined) {
            let stationname: string = section.departure.place.name;
            stationname = stationname.replace("Bf", "");

            return fetch(generateDisturbanceApiURL(stationname))
              .then(function (response) {
                if (response.status === 200) {
                  return response.json();
                }
              }).then(function (data) {
                if (data !== undefined) {
                  section.departure.place.evaNr = data.evaNr;
                } else {
                  section.departure.place.evaNr = null;
                }
                console.log("A" + section.departure.place.evaNr);
              });
          }
        }
      });
    }).flat(),
  );

  aggregatedData.routes.forEach((element) => {
    element.sections.forEach((section) => {
      console.log("B" + section.departure.place.evaNr);
    });
  });

  return aggregatedData;
}

/**
 * Generates the URL for requesting the DisturbanceAPI.
 *
 * @param station The station to request the evaNr from.
 * @return URL for the DisturbanceAPI.
 */

function generateDisturbanceApiURL(station: string) {
  const url = new URL(
    "http://" + DISTURBANCE_HOST + ":" + DISTURBANCE_PORT +
      "/stations?station=" + station,
  );

  return url;
}
