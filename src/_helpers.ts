/**
 * Convenience helpers for common QR code use cases
 */

import { qrcode } from "./_qrcode";
import type { QRCodeSVGOptions } from "./renderers/svg/types";
import type { QRCodeOptions } from "./encoders/qr/types";

type QROpts = QRCodeSVGOptions & QRCodeOptions;

function escapeWifi(str: string): string {
  return str.replace(/([\\;,:"'])/g, "\\$1");
}

/** Generate a WiFi QR code */
export function wifi(
  ssid: string,
  password: string,
  options?: QROpts & { encryption?: "WPA" | "WEP" | "nopass"; hidden?: boolean },
): string {
  const { encryption = "WPA", hidden, ...qrOpts } = options ?? {};
  let text = `WIFI:T:${encryption};S:${escapeWifi(ssid)};P:${escapeWifi(password)};`;
  if (hidden) text += "H:true;";
  text += ";";
  return qrcode(text, qrOpts);
}

/** Generate a URL QR code */
export function url(urlString: string, options?: QROpts): string {
  return qrcode(urlString, options);
}

/** Generate an email QR code */
export function email(address: string, options?: QROpts): string {
  return qrcode(`mailto:${address}`, options);
}

/** Generate an SMS QR code */
export function sms(number: string, body?: string, options?: QROpts): string {
  const text = body ? `sms:${number}?body=${encodeURIComponent(body)}` : `sms:${number}`;
  return qrcode(text, options);
}

/** Generate a geo location QR code */
export function geo(lat: number, lng: number, options?: QROpts): string {
  return qrcode(`geo:${lat},${lng}`, options);
}

/** Generate a phone call QR code */
export function phone(number: string, options?: QROpts): string {
  return qrcode(`tel:${number}`, options);
}

/** Generate a vCard QR code */
export function vcard(
  contact: {
    firstName: string;
    lastName?: string;
    phone?: string;
    email?: string;
    org?: string;
    title?: string;
    url?: string;
    address?: string;
  },
  options?: QROpts,
): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${contact.lastName ?? ""};${contact.firstName};;;`,
    `FN:${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ""}`,
  ];
  if (contact.phone) lines.push(`TEL:${contact.phone}`);
  if (contact.email) lines.push(`EMAIL:${contact.email}`);
  if (contact.org) lines.push(`ORG:${contact.org}`);
  if (contact.title) lines.push(`TITLE:${contact.title}`);
  if (contact.url) lines.push(`URL:${contact.url}`);
  if (contact.address) lines.push(`ADR:;;${contact.address};;;;`);
  lines.push("END:VCARD");
  return qrcode(lines.join("\n"), options);
}

/** Generate a MeCard QR code */
export function mecard(
  contact: { name: string; phone?: string; email?: string; url?: string; address?: string },
  options?: QROpts,
): string {
  let text = `MECARD:N:${contact.name};`;
  if (contact.phone) text += `TEL:${contact.phone};`;
  if (contact.email) text += `EMAIL:${contact.email};`;
  if (contact.url) text += `URL:${contact.url};`;
  if (contact.address) text += `ADR:${contact.address};`;
  text += ";";
  return qrcode(text, options);
}

/** Generate a calendar event QR code */
export function event(
  ev: {
    title: string;
    start: Date | string;
    end?: Date | string;
    location?: string;
    description?: string;
  },
  options?: QROpts,
): string {
  const fmt = (d: Date | string) => {
    const date = typeof d === "string" ? new Date(d) : d;
    return date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  };
  const lines = ["BEGIN:VEVENT", `SUMMARY:${ev.title}`, `DTSTART:${fmt(ev.start)}`];
  if (ev.end) lines.push(`DTEND:${fmt(ev.end)}`);
  if (ev.location) lines.push(`LOCATION:${ev.location}`);
  if (ev.description) lines.push(`DESCRIPTION:${ev.description}`);
  lines.push("END:VEVENT");
  return qrcode(lines.join("\n"), options);
}

/** Generate a Swiss QR Code for QR-bill payments */
export function swissQR(
  data: {
    iban: string;
    creditor: {
      name: string;
      street?: string;
      houseNumber?: string;
      postalCode: string;
      city: string;
      country: string;
    };
    amount?: number;
    currency?: "CHF" | "EUR";
    debtor?: {
      name: string;
      street?: string;
      houseNumber?: string;
      postalCode: string;
      city: string;
      country: string;
    };
    reference?: string;
    referenceType?: "QRR" | "SCOR" | "NON";
    additionalInfo?: string;
  },
  options?: QROpts,
): string {
  const lines: string[] = [
    "SPC",
    "0200",
    "1",
    data.iban.replace(/\s/g, ""),
    "S",
    data.creditor.name,
    data.creditor.street ?? "",
    data.creditor.houseNumber ?? "",
    data.creditor.postalCode,
    data.creditor.city,
    data.creditor.country,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    data.amount !== undefined ? data.amount.toFixed(2) : "",
    data.currency ?? "CHF",
    data.debtor ? "S" : "",
    data.debtor?.name ?? "",
    data.debtor?.street ?? "",
    data.debtor?.houseNumber ?? "",
    data.debtor?.postalCode ?? "",
    data.debtor?.city ?? "",
    data.debtor?.country ?? "",
    data.referenceType ?? "NON",
    data.reference ?? "",
    data.additionalInfo ?? "",
    "EPD",
  ];
  return qrcode(lines.join("\n"), { ecLevel: "M", ...options });
}

/** Generate a GS1 Digital Link QR code */
export function gs1DigitalLink(
  data: {
    gtin: string;
    batch?: string;
    serial?: string;
    expiry?: string;
    weight?: string;
    lot?: string;
    [key: string]: string | undefined;
  },
  options?: QROpts & { domain?: string },
): string {
  const { domain = "https://id.gs1.org", ...qrOpts } = options ?? {};
  let path = `/01/${data.gtin}`;
  if (data.batch ?? data.lot) path += `/10/${data.batch ?? data.lot}`;
  if (data.serial) path += `/21/${data.serial}`;
  if (data.expiry) path += `/17/${data.expiry}`;
  if (data.weight) path += `/3103/${data.weight}`;
  const knownKeys = new Set(["gtin", "batch", "serial", "expiry", "weight", "lot"]);
  for (const [key, value] of Object.entries(data)) {
    if (!knownKeys.has(key) && value) path += `/${key}/${value}`;
  }
  return qrcode(`${domain}${path}`, qrOpts);
}
