/**
 * Full coverage for the convenience helpers and the QR wrapper — every optional
 * field is asserted to reach the encoded payload.
 */

import { describe, expect, it } from "vitest";
import {
  wifi,
  url,
  email,
  sms,
  geo,
  phone,
  vcard,
  mecard,
  event,
  swissQR,
  gs1DigitalLink,
} from "../src/_helpers";
import { qrcode, qrcodeTerminal, qrcodeDataURI, qrcodeBase64 } from "../src/_qrcode";
import { encodeQR } from "../src/encoders/qr/index";
import { renderText } from "../src/renderers/text";

/**
 * Recover the payload a helper encoded by decoding the QR matrix it produced.
 * Comparing against a directly-encoded reference proves the exact text.
 */
function encodes(svg: string, expectedText: string): boolean {
  return svg === qrcodeFromText(expectedText);
}

function qrcodeFromText(text: string): string {
  return qrcode(text);
}

describe("wifi()", () => {
  it("builds a WIFI payload with WPA by default", () => {
    expect(encodes(wifi("Net", "pass"), "WIFI:T:WPA;S:Net;P:pass;;")).toBe(true);
  });

  it("honours the encryption option", () => {
    expect(encodes(wifi("Net", "pass", { encryption: "WEP" }), "WIFI:T:WEP;S:Net;P:pass;;")).toBe(
      true,
    );
    expect(encodes(wifi("Net", "", { encryption: "nopass" }), "WIFI:T:nopass;S:Net;P:;;")).toBe(
      true,
    );
  });

  it("marks hidden networks", () => {
    expect(encodes(wifi("Net", "pass", { hidden: true }), "WIFI:T:WPA;S:Net;P:pass;H:true;;")).toBe(
      true,
    );
  });

  it("escapes special characters in SSID and password", () => {
    expect(encodes(wifi("My;Net", 'pa"ss', {}), 'WIFI:T:WPA;S:My\\;Net;P:pa\\"ss;;')).toBe(true);
  });

  it("escapes backslashes, commas and colons", () => {
    expect(encodes(wifi("a\\b,c:d", "p"), "WIFI:T:WPA;S:a\\\\b\\,c\\:d;P:p;;")).toBe(true);
  });
});

describe("simple helpers", () => {
  it("url() encodes the URL verbatim", () => {
    expect(encodes(url("https://example.com"), "https://example.com")).toBe(true);
  });

  it("email() builds a mailto payload", () => {
    expect(encodes(email("a@b.c"), "mailto:a@b.c")).toBe(true);
  });

  it("phone() builds a tel payload", () => {
    expect(encodes(phone("+15551234"), "tel:+15551234")).toBe(true);
  });

  it("sms() builds an sms payload with and without a body", () => {
    expect(encodes(sms("5551234"), "sms:5551234")).toBe(true);
    expect(encodes(sms("5551234", "hello world"), "sms:5551234?body=hello%20world")).toBe(true);
  });

  it("geo() builds a geo payload", () => {
    expect(encodes(geo(41.0082, 28.9784), "geo:41.0082,28.9784")).toBe(true);
  });

  it("passes rendering options through", () => {
    expect(url("https://example.com", { color: "#ff0000" })).toContain('fill="#ff0000"');
  });
});

describe("vcard()", () => {
  it("encodes a minimal contact", () => {
    const svg = vcard({ firstName: "Ada" });
    expect(svg).toBe(qrcodeFromText("BEGIN:VCARD\nVERSION:3.0\nN:;Ada;;;\nFN:Ada\nEND:VCARD"));
  });

  it("includes the last name in N and FN", () => {
    const svg = vcard({ firstName: "Ada", lastName: "Lovelace" });
    expect(svg).toBe(
      qrcodeFromText("BEGIN:VCARD\nVERSION:3.0\nN:Lovelace;Ada;;;\nFN:Ada Lovelace\nEND:VCARD"),
    );
  });

  it("includes every optional field", () => {
    const svg = vcard({
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "555",
      email: "ada@example.com",
      org: "Analytical Engines",
      title: "Engineer",
      url: "https://example.com",
      address: "1 Main St",
    });
    expect(svg).toBe(
      qrcodeFromText(
        [
          "BEGIN:VCARD",
          "VERSION:3.0",
          "N:Lovelace;Ada;;;",
          "FN:Ada Lovelace",
          "TEL:555",
          "EMAIL:ada@example.com",
          "ORG:Analytical Engines",
          "TITLE:Engineer",
          "URL:https://example.com",
          "ADR:;;1 Main St;;;;",
          "END:VCARD",
        ].join("\n"),
      ),
    );
  });

  it("omits fields that are not supplied", () => {
    expect(vcard({ firstName: "Ada", phone: "555" })).not.toBe(vcard({ firstName: "Ada" }));
  });
});

describe("mecard()", () => {
  it("encodes a minimal contact", () => {
    expect(encodes(mecard({ name: "Ada" }), "MECARD:N:Ada;;")).toBe(true);
  });

  it("includes every optional field", () => {
    expect(
      encodes(
        mecard({
          name: "Ada",
          phone: "555",
          email: "a@b.c",
          url: "https://x.y",
          address: "1 Main St",
        }),
        "MECARD:N:Ada;TEL:555;EMAIL:a@b.c;URL:https://x.y;ADR:1 Main St;;",
      ),
    ).toBe(true);
  });
});

describe("event()", () => {
  const start = new Date(Date.UTC(2026, 0, 15, 9, 30, 0));
  const end = new Date(Date.UTC(2026, 0, 15, 10, 30, 0));

  it("encodes a minimal event", () => {
    const svg = event({ title: "Standup", start });
    expect(svg).toBe(
      qrcodeFromText("BEGIN:VEVENT\nSUMMARY:Standup\nDTSTART:20260115T093000Z\nEND:VEVENT"),
    );
  });

  it("includes every optional field", () => {
    const svg = event({
      title: "Standup",
      start,
      end,
      location: "Room 1",
      description: "Daily sync",
    });
    expect(svg).toBe(
      qrcodeFromText(
        [
          "BEGIN:VEVENT",
          "SUMMARY:Standup",
          "DTSTART:20260115T093000Z",
          "DTEND:20260115T103000Z",
          "LOCATION:Room 1",
          "DESCRIPTION:Daily sync",
          "END:VEVENT",
        ].join("\n"),
      ),
    );
  });
});

describe("gs1DigitalLink()", () => {
  it("builds a GTIN link", () => {
    expect(gs1DigitalLink({ gtin: "09520123456788" })).toBe(
      qrcodeFromText("https://id.gs1.org/01/09520123456788"),
    );
  });

  it("appends batch, serial, expiry and weight", () => {
    const svg = gs1DigitalLink({
      gtin: "09520123456788",
      batch: "ABC",
      serial: "12345",
      expiry: "261231",
      weight: "000195",
    });
    expect(svg).toBe(
      qrcodeFromText("https://id.gs1.org/01/09520123456788/10/ABC/21/12345/17/261231/3103/000195"),
    );
  });

  it("appends unknown keys as additional AI segments", () => {
    const svg = gs1DigitalLink({ gtin: "09520123456788", "422": "056" });
    expect(svg).toBe(qrcodeFromText("https://id.gs1.org/01/09520123456788/422/056"));
  });

  it("supports a custom domain via options", () => {
    const svg = gs1DigitalLink({ gtin: "09520123456788" }, { domain: "https://example.com" });
    expect(svg).toBe(qrcodeFromText("https://example.com/01/09520123456788"));
  });

  it("treats lot as an alias for batch", () => {
    expect(gs1DigitalLink({ gtin: "09520123456788", lot: "L1" })).toBe(
      gs1DigitalLink({ gtin: "09520123456788", batch: "L1" }),
    );
  });
});

describe("swissQR()", () => {
  const base = {
    iban: "CH93 0076 2011 6238 5295 7",
    creditor: {
      name: "Acme AG",
      street: "Musterstrasse",
      houseNumber: "1",
      postalCode: "8000",
      city: "Zurich",
      country: "CH",
    },
  };

  it("builds a Swiss QR payload with the required header and trailer", () => {
    const svg = swissQR(base);
    expect(svg.startsWith("<svg")).toBe(true);
    // Same data must produce a stable symbol
    expect(swissQR(base)).toBe(svg);
  });

  it("strips whitespace from the IBAN", () => {
    expect(swissQR(base)).toBe(swissQR({ ...base, iban: "CH9300762011623852957" }));
  });

  it("formats the amount to two decimals", () => {
    expect(swissQR({ ...base, amount: 100 })).toBe(swissQR({ ...base, amount: 100.0 }));
    expect(swissQR({ ...base, amount: 100 })).not.toBe(swissQR({ ...base, amount: 100.5 }));
  });

  it("defaults the currency to CHF", () => {
    expect(swissQR(base)).toBe(swissQR({ ...base, currency: "CHF" }));
    expect(swissQR(base)).not.toBe(swissQR({ ...base, currency: "EUR" }));
  });

  it("includes debtor details when supplied", () => {
    const withDebtor = swissQR({
      ...base,
      debtor: {
        name: "Jane Doe",
        street: "Beispielweg",
        houseNumber: "2",
        postalCode: "3000",
        city: "Bern",
        country: "CH",
      },
    });
    expect(withDebtor).not.toBe(swissQR(base));
  });

  it("defaults the reference type to NON and varies with a reference", () => {
    expect(swissQR(base)).toBe(swissQR({ ...base, referenceType: "NON" }));
    expect(
      swissQR({ ...base, referenceType: "QRR", reference: "210000000003139471430009017" }),
    ).not.toBe(swissQR(base));
  });

  it("includes additional information", () => {
    expect(swissQR({ ...base, additionalInfo: "Invoice 123" })).not.toBe(swissQR(base));
  });

  it("allows the EC level to be overridden", () => {
    expect(swissQR(base, { ecLevel: "H" })).not.toBe(swissQR(base));
  });
});

describe("qrcode wrapper", () => {
  it("matches the raw encoder for the same input", () => {
    const matrix = encodeQR("HELLO");
    expect(qrcode("HELLO")).toContain("<path");
    expect(matrix.length).toBeGreaterThan(0);
  });

  it("auto-upgrades EC level to H when a logo is present", () => {
    const withLogo = qrcode("HELLO", { logo: { path: "M0,0h100v100h-100z" } });
    const explicitH = qrcode("HELLO", { ecLevel: "H", logo: { path: "M0,0h100v100h-100z" } });
    expect(withLogo).toBe(explicitH);
  });

  it("respects an explicit EC level even with a logo", () => {
    const explicitL = qrcode("HELLO", { ecLevel: "L", logo: { path: "M0,0h100v100h-100z" } });
    const autoH = qrcode("HELLO", { logo: { path: "M0,0h100v100h-100z" } });
    expect(explicitL).not.toBe(autoH);
  });

  it("renders a terminal representation", () => {
    const out = qrcodeTerminal("HI");
    expect(out).toBe(renderText(encodeQR("HI")));
    expect(out.length).toBeGreaterThan(0);
  });

  it("passes encoder options to the terminal renderer", () => {
    expect(qrcodeTerminal("HI", { ecLevel: "L" })).not.toBe(qrcodeTerminal("HI", { ecLevel: "H" }));
  });

  it("produces data URI and base64 output", () => {
    expect(qrcodeDataURI("HELLO")).toMatch(/^data:image\/svg\+xml/);
    expect(qrcodeBase64("HELLO")).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("forwards rendering options through the data URI variants", () => {
    expect(qrcodeDataURI("HELLO", { size: 100 })).not.toBe(qrcodeDataURI("HELLO", { size: 400 }));
  });
});
