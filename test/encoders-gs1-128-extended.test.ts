import { describe, expect, it } from "vitest";
import { encodeGS1128 } from "../src/encoders/gs1-128";

describe("GS1-128 extended AIs", () => {
  it("encodes SSCC-18 with AI 00", () => {
    const bars = encodeGS1128("(00)123456789012345678");
    expect(bars.length).toBeGreaterThan(0);
    for (const b of bars) expect(b).toBeGreaterThanOrEqual(1);
  });

  it("encodes AI 310x weight", () => {
    const bars = encodeGS1128("(3102)123456");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes AI 402 shipment ID (17 digits)", () => {
    const bars = encodeGS1128("(402)12345678901234567");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes AI 240 additional item ID", () => {
    const bars = encodeGS1128("(240)PARTNUM123");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes AI 710 NHRN", () => {
    const bars = encodeGS1128("(710)ABC123DEF");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes AI 12 due date", () => {
    const bars = encodeGS1128("(12)260401");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes AI 420 domestic postal code", () => {
    const bars = encodeGS1128("(420)12345");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes AI 8007 IBAN", () => {
    const bars = encodeGS1128("(8007)DE89370400440532013000");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes multiple mixed AIs", () => {
    const bars = encodeGS1128("(01)12345678901234(10)BATCH01(17)260101(21)SERIAL01");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("handles unknown AI as variable-length without error", () => {
    const bars = encodeGS1128("(99)UNKNOWNDATA");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes SSCC + GTIN together", () => {
    const bars = encodeGS1128("(00)123456789012345678(01)12345678901234");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes trade measure 350x area", () => {
    const bars = encodeGS1128("(3500)654321");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes amount payable 390x", () => {
    const bars = encodeGS1128("(3900)12345");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("different AIs produce different outputs", () => {
    const a = encodeGS1128("(01)12345678901234");
    const b = encodeGS1128("(02)12345678901234");
    expect(a).not.toEqual(b);
  });
});
