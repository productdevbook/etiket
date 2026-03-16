import { describe, expect, it } from "vitest";
import { encodePDF417 } from "../src/encoders/pdf417/index";

describe("PDF417 encoding support", () => {
  it("encodes basic ASCII text", () => {
    const result = encodePDF417("Hello World");
    expect(result.matrix.length).toBeGreaterThan(0);
  });

  it("encodes Euro sign (€) via ISO-8859-15", () => {
    const result = encodePDF417("Price: 50€");
    expect(result.matrix.length).toBeGreaterThan(0);
  });

  it("encodes Š/š (ISO-8859-15 specific)", () => {
    const result = encodePDF417("Škoda");
    expect(result.matrix.length).toBeGreaterThan(0);
  });

  it("encodes Ž/ž (ISO-8859-15 specific)", () => {
    const result = encodePDF417("Žilina");
    expect(result.matrix.length).toBeGreaterThan(0);
  });

  it("encodes Œ/œ (ISO-8859-15 specific)", () => {
    const result = encodePDF417("œuvre");
    expect(result.matrix.length).toBeGreaterThan(0);
  });

  it("encodes Ÿ (ISO-8859-15 specific)", () => {
    const result = encodePDF417("Ÿvette");
    expect(result.matrix.length).toBeGreaterThan(0);
  });

  it("encodes mixed Latin-1 and ISO-8859-15", () => {
    const result = encodePDF417("Café 50€ — Škoda Œuvre");
    expect(result.matrix.length).toBeGreaterThan(0);
  });

  it("different text produces different matrix", () => {
    const a = encodePDF417("Hello");
    const b = encodePDF417("World");
    const aStr = a.matrix.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    const bStr = b.matrix.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    expect(aStr).not.toBe(bStr);
  });
});
