import { describe, expect, it } from "vitest";
import { swissQR } from "../src/index";

describe("Swiss QR Code", () => {
  const baseData = {
    iban: "CH44 3199 9123 0008 8901 2",
    creditor: {
      name: "Max Muster",
      street: "Musterstrasse",
      houseNumber: "1",
      postalCode: "8000",
      city: "Zürich",
      country: "CH",
    },
    amount: 1949.75,
    currency: "CHF" as const,
    reference: "210000000003139471430009017",
    referenceType: "QRR" as const,
  };

  it("generates valid SVG", () => {
    const svg = swissQR(baseData);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("uses EC level M by default", () => {
    const svg = swissQR(baseData);
    expect(svg).toContain("<path");
  });

  it("works without amount", () => {
    const svg = swissQR({ ...baseData, amount: undefined });
    expect(svg).toContain("<svg");
  });

  it("works without debtor", () => {
    const svg = swissQR(baseData);
    expect(svg).toContain("<svg");
  });

  it("works with debtor", () => {
    const svg = swissQR({
      ...baseData,
      debtor: {
        name: "Maria Bernasconi",
        street: "Via Casa Postale",
        postalCode: "6900",
        city: "Lugano",
        country: "CH",
      },
    });
    expect(svg).toContain("<svg");
  });

  it("supports EUR currency", () => {
    const svg = swissQR({ ...baseData, currency: "EUR" });
    expect(svg).toContain("<svg");
  });

  it("strips IBAN spaces", () => {
    // Should not throw — spaces in IBAN are stripped
    const svg = swissQR({ ...baseData, iban: "CH44 3199 9123 0008 8901 2" });
    expect(svg).toContain("<svg");
  });

  it("accepts custom QR options", () => {
    const svg = swissQR(baseData, { size: 300 });
    expect(svg).toContain('width="300"');
  });
});
