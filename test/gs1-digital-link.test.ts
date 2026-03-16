import { describe, expect, it } from "vitest";
import { gs1DigitalLink } from "../src/index";

describe("GS1 Digital Link", () => {
  it("generates QR with GTIN only", () => {
    const svg = gs1DigitalLink({ gtin: "09520123456788" });
    expect(svg).toContain("<svg");
  });

  it("generates QR with GTIN + batch + serial", () => {
    const svg = gs1DigitalLink({
      gtin: "09520123456788",
      batch: "ABC123",
      serial: "12345",
    });
    expect(svg).toContain("<svg");
  });

  it("generates QR with custom domain", () => {
    const svg = gs1DigitalLink({ gtin: "09520123456788" }, { domain: "https://example.com" });
    expect(svg).toContain("<svg");
  });

  it("generates QR with expiry and weight", () => {
    const svg = gs1DigitalLink({
      gtin: "09520123456788",
      expiry: "260101",
      weight: "001500",
    });
    expect(svg).toContain("<svg");
  });

  it("accepts QR options", () => {
    const svg = gs1DigitalLink({ gtin: "09520123456788" }, { size: 300, ecLevel: "H" });
    expect(svg).toContain('width="300"');
  });
});
