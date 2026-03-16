import {
  barcode,
  qrcode,
  datamatrix,
  pdf417,
  aztec,
  wifi,
  email,
  phone,
  geo,
  vcard,
  event,
} from "etiket";

export function setupApp() {
  const root = document.getElementById("app")!;

  // Tabs
  const tabs = root.querySelectorAll<HTMLButtonElement>(".tab");
  const panels = root.querySelectorAll<HTMLElement>(".panel");
  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      for (const t of tabs) t.classList.remove("active");
      for (const p of panels) p.classList.remove("active");
      tab.classList.add("active");
      root.querySelector<HTMLElement>(`[data-panel="${tab.dataset.tab}"]`)!.classList.add("active");
    });
  }

  // Utils
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const val = (id: string) => ($<HTMLInputElement>(id)).value;
  const numVal = (id: string) => Number(val(id));

  function renderSafe(target: HTMLElement, fn: () => string) {
    try {
      target.innerHTML = fn();
    }
    catch (err) {
      target.innerHTML = `<div class="error">${(err as Error).message}</div>`;
    }
  }

  function copyAndDownload(prefix: string, getFn: () => string) {
    $(`${prefix}-copy`).addEventListener("click", () => {
      try {
        navigator.clipboard.writeText(getFn());
      }
      catch {}
    });
    $(`${prefix}-download`).addEventListener("click", () => {
      try {
        const blob = new Blob([getFn()], { type: "image/svg+xml" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${prefix}.svg`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      catch {}
    });
  }

  // --- Barcode ---
  function renderBarcode() {
    renderSafe($("bc-output"), () =>
      barcode(val("bc-data"), {
        type: val("bc-type") as any,
        height: numVal("bc-height"),
        barWidth: numVal("bc-barwidth"),
        color: val("bc-color"),
        showText: val("bc-showtext") === "true",
      }),
    );
  }

  for (const id of ["bc-data", "bc-type", "bc-height", "bc-barwidth", "bc-color", "bc-showtext"]) {
    $(id).addEventListener("input", renderBarcode);
  }
  copyAndDownload("bc", () =>
    barcode(val("bc-data"), {
      type: val("bc-type") as any,
      height: numVal("bc-height"),
      barWidth: numVal("bc-barwidth"),
      color: val("bc-color"),
      showText: val("bc-showtext") === "true",
    }),
  );
  renderBarcode();

  // --- QR Code ---
  function renderQR() {
    renderSafe($("qr-output"), () =>
      qrcode(val("qr-data"), {
        size: numVal("qr-size"),
        ecLevel: val("qr-ec") as any,
        dotType: val("qr-dot") as any,
        color: val("qr-color"),
        background: val("qr-bg"),
        margin: numVal("qr-margin"),
      }),
    );
  }

  for (const id of ["qr-data", "qr-size", "qr-ec", "qr-dot", "qr-color", "qr-bg", "qr-margin"]) {
    $(id).addEventListener("input", renderQR);
  }
  copyAndDownload("qr", () =>
    qrcode(val("qr-data"), {
      size: numVal("qr-size"),
      ecLevel: val("qr-ec") as any,
      dotType: val("qr-dot") as any,
      color: val("qr-color"),
      background: val("qr-bg"),
      margin: numVal("qr-margin"),
    }),
  );
  renderQR();

  // --- 2D Codes ---
  const matrix2DGenerators: Record<string, (text: string, opts: any) => string> = {
    datamatrix,
    pdf417,
    aztec,
  };

  function render2D() {
    const format = val("m2d-format");
    const fn = matrix2DGenerators[format];
    renderSafe($("m2d-output"), () => fn(val("m2d-data"), { color: val("m2d-color") }));
  }

  for (const id of ["m2d-data", "m2d-format", "m2d-color"]) {
    $(id).addEventListener("input", render2D);
  }
  copyAndDownload("m2d", () => {
    const fn = matrix2DGenerators[val("m2d-format")];
    return fn(val("m2d-data"), { color: val("m2d-color") });
  });
  render2D();

  // --- Helpers ---
  function renderHelpers() {
    renderSafe($("h-wifi-out"), () => wifi(val("h-wifi-ssid"), val("h-wifi-pass")));
    renderSafe($("h-email-out"), () => email(val("h-email")));
    renderSafe($("h-phone-out"), () => phone(val("h-phone")));
    renderSafe($("h-geo-out"), () => geo(numVal("h-geo-lat"), numVal("h-geo-lng")));
    renderSafe($("h-vcard-out"), () =>
      vcard({
        firstName: val("h-vc-fn"),
        lastName: val("h-vc-ln"),
        phone: val("h-vc-phone"),
        email: val("h-vc-email"),
      }),
    );
    renderSafe($("h-event-out"), () =>
      event({
        title: val("h-ev-title"),
        start: val("h-ev-start"),
        end: val("h-ev-end"),
      }),
    );
  }

  const helperInputIds = [
    "h-wifi-ssid", "h-wifi-pass", "h-email", "h-phone",
    "h-geo-lat", "h-geo-lng", "h-vc-fn", "h-vc-ln",
    "h-vc-phone", "h-vc-email", "h-ev-title", "h-ev-start", "h-ev-end",
  ];
  for (const id of helperInputIds) {
    $(id).addEventListener("input", renderHelpers);
  }
  renderHelpers();
}
