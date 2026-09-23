import { describe, expect, it } from "vitest";
import {
  decodeCustomLocation,
  encodeCustomLocation,
  findLocation,
  isValidLocationId,
  LOCATIONS,
} from "./locations";

describe("custom location ids", () => {
  it("round-trips name, region and coordinates", () => {
    const loc = { name: "Tokyo", region: "Tokyo, JP", lat: 35.6762, lon: 139.6503 };
    const id = encodeCustomLocation(loc);
    expect(id.startsWith("c.")).toBe(true);
    expect(decodeCustomLocation(id)).toEqual({ id, ...loc });
  });

  it("handles unicode city names", () => {
    const loc = { name: "München", region: "Bavaria, DE", lat: 48.1351, lon: 11.582 };
    const id = encodeCustomLocation(loc);
    expect(decodeCustomLocation(id)?.name).toBe("München");
  });

  it("rejects invalid payloads", () => {
    expect(decodeCustomLocation("c.not-base64!!!")).toBeNull();
    expect(decodeCustomLocation("c." + btoa("not-json"))).toBeNull();
    expect(decodeCustomLocation("c." + btoa(JSON.stringify(["Tokyo", "JP", 999, 0])))).toBeNull();
    expect(decodeCustomLocation("udaipur")).toBeNull();
  });

  it("isValidLocationId accepts seeds, custom ids and empty", () => {
    expect(isValidLocationId("udaipur")).toBe(true);
    expect(isValidLocationId(undefined)).toBe(true);
    expect(isValidLocationId("")).toBe(true);
    expect(isValidLocationId(encodeCustomLocation({ name: "Paris", region: "FR", lat: 48.8566, lon: 2.3522 }))).toBe(true);
    expect(isValidLocationId("nope")).toBe(false);
  });

  it("findLocation resolves seeds, custom ids and falls back to default", () => {
    expect(findLocation("jaipur").name).toBe("Jaipur");
    const custom = encodeCustomLocation({ name: "Lisbon", region: "PT", lat: 38.7223, lon: -9.1393 });
    expect(findLocation(custom)).toMatchObject({ name: "Lisbon", lat: 38.7223 });
    expect(findLocation("unknown-city")).toEqual(LOCATIONS[0]);
    expect(findLocation(undefined)).toEqual(LOCATIONS[0]);
  });
});
