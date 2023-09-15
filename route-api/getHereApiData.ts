import { GetRouteOptions } from "./routes.ts";

/**
 * Calls main functions for getting data from the HereAPI.
 *
 * @param apiKey The API key for the HereAPI.
 * @param options The options for the Route.
 * @return Route-data from the HereAPI.
 */

export async function getRouteData(options: GetRouteOptions, apiKey: string) {
  const optionsAsString = changeObjectToString(options);
  const url = generateHereApiURL(optionsAsString, apiKey);
  try {
    const route = await fetch(url);
    return route.json();
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
  const objectWithoutNull = Object.entries(object).filter(
    ([_, value]) => value != null,
  );
  const objectWithString = objectWithoutNull.map(([key, value]) => {
    return [key, `${value}`];
  });
  return objectWithString;
}

/**
 * Generates the URL for requesting the HereAPI.
 *
 * @param options The options for the Route as a string.
 * @return URL for the HereAPI.
 */

export function generateHereApiURL(options: string[][], apiKey?: string) {
  const params = new URLSearchParams(options);

  const url = new URL(
    "https://transit.router.hereapi.com/v8/routes?apiKey=" + apiKey + "&" +
      params.toString(),
  );
  return url;
}
