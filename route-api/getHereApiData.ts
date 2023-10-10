import { GetRouteOptions } from "./routes.ts";

/**
 * Calls main functions for getting data from the HereAPI.
 *
 * @param apiKey The API key for the HereAPI.
 * @param options The options for the Route.
 * @return Route-data from the HereAPI.
 */

export async function getRouteData(options: GetRouteOptions, apiKey: string) {
  const OPTIONS_AS_STRING = changeObjectToString(options);
  const URL = generateHereApiURL(OPTIONS_AS_STRING, apiKey);
  try {
    const ROUTE = await fetch(URL);
    return ROUTE.json();
  } catch (error) {
    console.log(error);
  }
}

/**
 * Takes GetRouteOptions and converts it to a string.
 *
 * @param object RouteOptions-Object for the Route.
 * @return GetRouteOptions as a string.
 */

export function changeObjectToString(object: GetRouteOptions) {
  const OBJECT_WITHOUT_NULL = Object.entries(object).filter(
    ([_, value]) => value != null,
  );
  const OBJECT_WITH_STRING = OBJECT_WITHOUT_NULL.map(([key, value]) => {
    return [key, `${value}`];
  });
  return OBJECT_WITH_STRING;
}

/**
 * Generates the URL for requesting the HereAPI.
 *
 * @param options The options for the Route as a string.
 * @return URL for the HereAPI.
 */

export function generateHereApiURL(options: string[][], apiKey?: string) {
  const PARAMS = new URLSearchParams(options);

  const API_URL = new URL(
    "https://transit.router.hereapi.com/v8/routes?apiKey=" + apiKey + "&" +
      PARAMS.toString(),
  );
  return API_URL;
}
