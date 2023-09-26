import { assertEquals } from "std/assert/mod.ts";

import { generateDisturbanceApiURL } from "./aggregateData.ts";
import { generateHereApiURL } from "./getHereApiData.ts";
import { changeObjectToString } from "./getHereApiData.ts";
import { GetRouteOptions } from "./routes.ts";

const DISTURBANCE_HOST = Deno.env.get("DISTURBANCE_HOST") || "localhost";
const DISTURBANCE_PORT = Deno.env.get("DISTURBANCE_PORT") || "3001";

Deno.test("changeObjectToString converts object to string array", () => {
  const OPTIONS: GetRouteOptions = {
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

  const result = changeObjectToString(OPTIONS);

  assertEquals(result, expectedArray);
});

Deno.test("generateHereApiURL generates the correct URL", () => {
  const OPTIONS = [["param1", "value1"], ["param2", "value2"]];
  const API_KEY = "api-key";
  const EXPEXTED_URL =
    `https://transit.router.hereapi.com/v8/routes?apiKey=${API_KEY}&param1=value1&param2=value2`;

  const result = generateHereApiURL(OPTIONS, API_KEY);

  assertEquals(result.toString(), EXPEXTED_URL);
});

Deno.test("generateDisturbanceApiURL should return a valid URL", () => {
  const STATION = "exampleStation";

  const EXPECTED_URL = new URL(
    "http://" + DISTURBANCE_HOST + ":" + DISTURBANCE_PORT +
      "/stations?station=" + STATION,
  );

  const ACTUAL_URL = generateDisturbanceApiURL(STATION);

  assertEquals(ACTUAL_URL.href, EXPECTED_URL.href);
});
