import { assertEquals } from "assert/mod.ts";

import { generateDisturbanceApiURL } from "./aggregateData.ts";
import { generateHereApiURL } from "./getHereApiData.ts";
import { changeObjectToString } from "./getHereApiData.ts";
import { GetRouteOptions } from "./routes.ts";

const DISTURBANCE_HOST = Deno.env.get("DISTURBANCE_HOST") || "localhost";
const DISTURBANCE_PORT = Deno.env.get("DISTURBANCE_PORT") || "3001";

Deno.test("changeObjectToString converts object to string array", () => {
  const options: GetRouteOptions = {
    origin: "A",
    destination: "B",
    arrivalTime: "10:00 AM",
    departureTime: "9:00 AM",
    lang: "en",
    units: "metric",
    changes: 2,
    alternatives: 1,
    modes: "transit",
    pedestrianSpeed: 1.5,
    return: "polyline",
  };

  const expectedArray: [string, string][] = [
    ["origin", "A"],
    ["destination", "B"],
    ["arrivalTime", "10:00 AM"],
    ["departureTime", "9:00 AM"],
    ["lang", "en"],
    ["units", "metric"],
    ["changes", "2"],
    ["alternatives", "1"],
    ["modes", "transit"],
    ["pedestrianSpeed", "1.5"],
    ["return", "polyline"],
  ];

  const result = changeObjectToString(options);

  assertEquals(result, expectedArray);
});

Deno.test("generateHereApiURL generates the correct URL", () => {
  const options = [["param1", "value1"], ["param2", "value2"]];
  const apiKey = "api-key";
  const expectedURL =
    `https://transit.router.hereapi.com/v8/routes?apiKey=${apiKey}&param1=value1&param2=value2`;

  const result = generateHereApiURL(options, apiKey);

  assertEquals(result.toString(), expectedURL);
});

Deno.test("generateDisturbanceApiURL should return a valid URL", () => {
  const station = "exampleStation";

  const expectedURL = new URL(
    "http://" + DISTURBANCE_HOST + ":" + DISTURBANCE_PORT +
      "/stations?station=" + station,
  );

  const actualURL = generateDisturbanceApiURL(station);

  assertEquals(actualURL.href, expectedURL.href);
});
