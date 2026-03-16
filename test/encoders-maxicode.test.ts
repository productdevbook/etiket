import { describe, expect, it } from "vitest";
import { encodeMaxiCode } from "../src/encoders/maxicode";

describe("MaxiCode", () => {
  it("encodes mode 4 (standard)", () => {
    const matrix = encodeMaxiCode("Hello World");
    expect(matrix.length).toBe(33);
    expect(matrix[0]!.length).toBe(30);
  });

  it("encodes mode 2 (US structured carrier)", () => {
    const matrix = encodeMaxiCode("UPS TRACKING DATA", {
      mode: 2,
      postalCode: "123456789",
      countryCode: 840,
      serviceClass: 1,
    });
    expect(matrix.length).toBe(33);
  });

  it("encodes mode 3 (international structured)", () => {
    const matrix = encodeMaxiCode("DHL DATA", {
      mode: 3,
      postalCode: "EC1A1B",
      countryCode: 826,
      serviceClass: 1,
    });
    expect(matrix.length).toBe(33);
  });

  it("produces boolean matrix", () => {
    const matrix = encodeMaxiCode("Test");
    for (const row of matrix) {
      for (const cell of row) {
        expect(typeof cell).toBe("boolean");
      }
    }
  });

  it("has data in matrix", () => {
    const matrix = encodeMaxiCode("Test");
    // Matrix should contain both dark and light modules
    let hasDark = false;
    let hasLight = false;
    for (const row of matrix) {
      for (const cell of row) {
        if (cell) hasDark = true;
        else hasLight = true;
      }
    }
    expect(hasDark).toBe(true);
    expect(hasLight).toBe(true);
  });

  it("throws on empty input", () => {
    expect(() => encodeMaxiCode("")).toThrow();
  });

  it("different data produces different matrix", () => {
    const a = encodeMaxiCode("Hello");
    const b = encodeMaxiCode("World");
    const aStr = a.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    const bStr = b.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    expect(aStr).not.toBe(bStr);
  });

  it("always 33x30", () => {
    const short = encodeMaxiCode("Hi");
    const long = encodeMaxiCode("This is a longer MaxiCode message for testing");
    expect(short.length).toBe(33);
    expect(short[0]!.length).toBe(30);
    expect(long.length).toBe(33);
    expect(long[0]!.length).toBe(30);
  });
});
