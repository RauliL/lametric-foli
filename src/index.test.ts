import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import app, { FoliResponse } from "./index.js";

const MOCK_RESPONSE: Readonly<FoliResponse> = {
  result: [
    {
      destinationdisplay: "T42",
      expectedarrivaltime: 1835541000,
      lineref: "Linja",
    },
  ],
};

describe("LaMetric Föli server", () => {
  const server = setupServer(
    http.get("http://data.foli.fi/siri/sm/:stop", () =>
      HttpResponse.json(MOCK_RESPONSE),
    ),
  );

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "bypass" });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    server.resetHandlers();
    vi.useRealTimers();
  });

  it("should return erroneous response when bus stop ID is missing", () =>
    request(app)
      .get("/")
      .then((response) => {
        expect(response.body).toEqual({
          frames: [{ icon: "stop", text: "Missing bus stop ID" }],
        });
      }));

  it("should return timetables returned from the API that are in the future", () => {
    vi.setSystemTime(new Date("2028-03-01T16:00:00.000Z"));

    return request(app)
      .get("/?id=T42")
      .then((response) => {
        expect(response.body).toEqual({
          frames: [{ icon: "föli", text: "16:30 - Linja / T42" }],
        });
      });
  });

  it("should not return timetables returned from the API that are in the past", () => {
    vi.setSystemTime(new Date("2028-03-01T17:00:00.000Z"));

    return request(app)
      .get("/?id=T42")
      .then((response) => {
        expect(response.body).toEqual({
          frames: [{ icon: "föli", text: "No arrivals" }],
        });
      });
  });

  it.each([
    ["Distance", "30 minutes"],
    ["12+hour+clock", "04:30PM"],
    ["24+hour+clock", "16:30"],
  ])("should support three different time formats", (format, expected) => {
    vi.setSystemTime(new Date("2028-03-01T16:00:00.000Z"));

    return request(app)
      .get(`/?id=T42&format=${format}`)
      .then((response) => {
        expect(response.body).toHaveProperty(
          ["frames", 0, "text"],
          `${expected} - Linja / T42`,
        );
      });
  });
});
