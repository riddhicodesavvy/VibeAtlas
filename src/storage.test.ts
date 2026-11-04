import { describe, it, expect } from "vitest";
import { emptyGuest, parseGuest } from "./storage";
import { safeURL } from "./api";

describe("guest storage boundary", () => {
  it("recovers from missing, malformed and unsupported storage versions", () => {
    for (const raw of [
      null,
      "broken json",
      "null",
      "[]",
      '{"version":999}',
      '{"version":1,"profile":{"release":"broken","features":[{}]}}',
    ]) {
      const result = parseGuest(raw);
      expect(result.profile).toBeNull();
      expect(result.version).toBe(1);
    }
  });
  it("retains valid collections while removing unsafe shapes and duplicate IDs", () => {
    const result = parseGuest(
      JSON.stringify({
        version: 1,
        likes: ["fma:one", null, "fma:one", 1],
        selection: ["fma:two", {}, "fma:three"],
        collections: [
          null,
          {
            id: "one",
            name: "After hours",
            trackIds: ["fma:one", null, "fma:one"],
          },
          { id: 9, name: "bad", trackIds: [] },
        ],
      }),
    );
    expect(result.likes).toEqual(["fma:one"]);
    expect(result.collections).toEqual([
      { id: "one", name: "After hours", trackIds: ["fma:one"] },
    ]);
    expect(result.selection).toEqual(["fma:two", "fma:three"]);
  });
  it("bounds stored selections and display names", () => {
    const result = parseGuest(
      JSON.stringify({
        version: 1,
        selection: Array.from({ length: 90 }, (_, i) => "fma:" + i),
        collections: [{ id: "one", name: "x".repeat(500), trackIds: [] }],
      }),
    );
    expect(result.selection).toHaveLength(30);
    expect(result.collections[0].name).toHaveLength(80);
  });
  it("does not mutate the default when a caller edits a recovered value", () => {
    const result = parseGuest(null);
    result.likes.push("test-only-record");
    result.collections.push({ id: "test", name: "test", trackIds: [] });
    expect(parseGuest(null).likes).toEqual([]);
    expect(emptyGuest.collections).toEqual([]);
  });
});
describe("source URL safety", () => {
  it("normalizes legacy CC links to HTTPS", () =>
    expect(safeURL("http://creativecommons.org/licenses/by/4.0/")).toBe(
      "https://creativecommons.org/licenses/by/4.0/",
    ));
  it("rejects executable, local, credential-bearing and malformed URLs", () => {
    for (const url of [
      "javascript:alert(1)",
      "file:///secret",
      "https://user:password@example.test/",
      "not a URL",
      "http://untrusted.test/",
    ])
      expect(safeURL(url)).toBe("#");
  });
  it("preserves secure provider pages", () =>
    expect(safeURL("https://www.jamendo.com/track/285")).toBe(
      "https://www.jamendo.com/track/285",
    ));
});
