type LatLng = {
  lat: number;
  lng: number;
};

type Place = {
  id?: string;
  name?: string;
  type: string;
  evaNr?: string | null;
  location: LatLng;
};

type TimeAndPlace = {
  time: string;
  place: Place;
  delay?: number;
};

export type GetRouteOptions = {
  origin: string;
  destination: string;
  arrivalTime?: string;
  departureTime?: string;
  lang?: string;
  units?: string;
  changes?: number;
  alternatives?: number;
  modes?: string;
  pedestrianSpeed?: number;
  return?: string;
};

// @see https://developer.here.com/documentation/intermodal-routing/dev_guide/concepts/modes.html
type HereApiTransportMode =
  | "highSpeedTrain"
  | "intercityTrain"
  | "interRegionalTrain"
  | "regionalTrain"
  | "cityTrain"
  | "bus"
  | "ferry"
  | "subway"
  | "lightRail"
  | "privateBus"
  | "inclined"
  | "aerial"
  | "busRapid"
  | "monorail"
  | "flight"
  | "walk"
  | "car"
  | "bicycle"
  | "pedestrian"
  | string;

export type HereApiRouteData = {
  routes: Array<{
    id: string;
    sections: Array<{
      id: string;
      type: string;
      departure: TimeAndPlace;
      arrival: TimeAndPlace;
      summary?: {
        duration: number;
        length: number;
      };
      actions?: Array<{
        action: string;
        duration: number;
        instruction: string;
        direction?: string;
        severity?: string;
        offset?: number;
        exit?: number;
      }>;
      polyline?: string;
      spans?: Array<{
        offset: number;
        names: Array<{
          value: string;
          language: string;
        }>;
      }>;
      transport: {
        mode: HereApiTransportMode;
        name?: string;
        category?: string;
        color?: string;
        textColor?: string;
        headsign?: string;
        shortName?: string;
      };
      intermediateStops?: Array<{
        departure: TimeAndPlace;
        duration?: number;
      }>;
      agency?: {
        id: string;
        name: string;
        website: string;
      };
    }>;
    agency?: {
      id: string;
      name: string;
      website: string;
    };
  }>;
};
