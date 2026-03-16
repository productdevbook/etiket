import { describe, expect, it, vi } from "vitest";

let capturedText = "";

vi.mock("../src/encoders/qr/index", () => ({
  encodeQR: (text: string) => {
    capturedText = text;
    // Return a minimal 1x1 matrix so the renderer can produce valid SVG
    return [[1]];
  },
}));

import { wifi, email, sms, geo, phone, vcard, mecard, event } from "../src/index";

describe("wifi", () => {
  it("defaults to WPA encryption", () => {
    wifi("MyNetwork", "secret123");
    expect(capturedText).toContain("T:WPA");
  });

  it("supports WEP encryption", () => {
    wifi("MyNetwork", "secret123", { encryption: "WEP" });
    expect(capturedText).toContain("T:WEP");
  });

  it("supports nopass encryption", () => {
    wifi("OpenNetwork", "", { encryption: "nopass" });
    expect(capturedText).toContain("T:nopass");
  });

  it("supports hidden SSID", () => {
    wifi("HiddenNet", "pass", { hidden: true });
    expect(capturedText).toContain("H:true");
  });

  it("does not include H:true when hidden is not set", () => {
    wifi("MyNetwork", "secret123");
    expect(capturedText).not.toContain("H:true");
  });

  it("generates a valid SVG string", () => {
    const svg = wifi("MyNetwork", "secret123");
    expect(svg).toContain("<svg");
  });
});

describe("email", () => {
  it("generates a valid SVG string", () => {
    const svg = email("test@example.com");
    expect(svg).toContain("<svg");
  });
});

describe("sms", () => {
  it("generates a valid SVG string", () => {
    const svg = sms("+1234567890");
    expect(svg).toContain("<svg");
  });

  it("generates a valid SVG string with body", () => {
    const svg = sms("+1234567890", "Hello there");
    expect(svg).toContain("<svg");
  });
});

describe("geo", () => {
  it("generates a valid SVG string", () => {
    const svg = geo(48.8566, 2.3522);
    expect(svg).toContain("<svg");
  });
});

describe("phone", () => {
  it("generates a valid SVG string", () => {
    const svg = phone("+1234567890");
    expect(svg).toContain("<svg");
  });
});

describe("vcard", () => {
  it("generates proper BEGIN:VCARD/END:VCARD", () => {
    vcard({ firstName: "John", lastName: "Doe" });
    expect(capturedText).toContain("BEGIN:VCARD");
    expect(capturedText).toContain("END:VCARD");
  });

  it("generates a valid SVG string", () => {
    const svg = vcard({ firstName: "John", lastName: "Doe" });
    expect(svg).toContain("<svg");
  });
});

describe("mecard", () => {
  it("generates MECARD: prefix", () => {
    mecard({ name: "Doe, John" });
    expect(capturedText).toContain("MECARD:");
  });

  it("generates a valid SVG string", () => {
    const svg = mecard({ name: "Doe, John" });
    expect(svg).toContain("<svg");
  });
});

describe("event", () => {
  it("generates BEGIN:VEVENT/END:VEVENT", () => {
    event({
      title: "Meeting",
      start: "2026-04-01T10:00:00Z",
      end: "2026-04-01T11:00:00Z",
    });
    expect(capturedText).toContain("BEGIN:VEVENT");
    expect(capturedText).toContain("END:VEVENT");
  });

  it("generates a valid SVG string", () => {
    const svg = event({
      title: "Meeting",
      start: "2026-04-01T10:00:00Z",
      end: "2026-04-01T11:00:00Z",
    });
    expect(svg).toContain("<svg");
  });
});
