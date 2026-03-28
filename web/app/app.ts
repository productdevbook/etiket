import {
  // High-level API
  barcode,
  qrcode,
  datamatrix,
  gs1datamatrix,
  pdf417,
  aztec,
  // Helpers
  wifi,
  url,
  email,
  sms,
  phone,
  geo,
  vcard,
  mecard,
  event,
  swissQR,
  gs1DigitalLink,
  // Raw 2D encoders
  encodeMicroQR,
  encodeMicroPDF417,
  encodeRMQR,
  encodeMaxiCode,
  encodeDotCode,
  encodeHanXin,
  encodeJABCode,
  encodeCodablockF,
  encodeCode16K,
  encodeGS1Composite,
  // Raw 4-state encoders
  encodeRM4SCC,
  encodeKIX,
  encodeAustraliaPost,
  encodeJapanPost,
  encodeIMb,
  // Healthcare encoders
  encodeHIBCPrimary,
  encodeHIBCSecondary,
  encodeHIBCConcatenated,
  encodeISBT128DIN,
  encodeISBT128Component,
  encodeISBT128Expiry,
  encodeISBT128BloodGroup,
  // Renderer
  renderMatrixSVG,
  // PNG
  barcodePNG,
  qrcodePNG,
  datamatrixPNG,
  gs1datamatrixPNG,
  pdf417PNG,
  aztecPNG,
  renderMatrixPNG,
} from "etiket";

import type { GradientOptions, LogoOptions } from "etiket";

// ── Constants ──

const BARCODE_DEFAULTS: Record<string, string> = {
  code128: "Hello World",
  code39: "HELLO",
  code39ext: "Hello!",
  code93: "HELLO",
  code93ext: "Hello!",
  code11: "0123456789",
  ean13: "5901234123457",
  ean8: "96385074",
  ean2: "53",
  ean5: "52495",
  upca: "012345678905",
  upce: "01234565",
  itf: "1234567890",
  itf14: "1234567890123",
  codabar: "A12345B",
  msi: "1234567",
  pharmacode: "1234",
  plessey: "01234567",
  "gs1-128": "(01)12345678901231",
  "gs1-databar": "0123456789012",
  "gs1-databar-limited": "0123456789012",
  "gs1-databar-expanded": "(01)12345678901231",
  identcode: "563102430313",
  leitcode: "21348075016401",
  postnet: "12345",
  planet: "1234567890",
  // 4-State
  rm4scc: "SW1A1AA",
  kix: "1234AB",
  "australia-post": "11:12345678",
  "japan-post": "1234567",
  imb: "01234567890123456789",
  // Healthcare
  "hibc-primary": "A123:PROD001:1",
  "hibc-secondary": "260101:LOT123",
  "hibc-concatenated": "A123:PROD001:260101:LOT1",
  "isbt-din": "US:01234:26:001234",
  "isbt-component": "E0791",
  "isbt-expiry": "260101",
  "isbt-bloodgroup": "51",
};

const FORMAT_HINTS: Record<string, string> = {
  "australia-post": "Format: FCC:DPID (e.g. 11:12345678)",
  "hibc-primary": "Format: LIC:PRODUCT:UOM (e.g. A123:PROD001:1)",
  "hibc-secondary": "Format: EXPIRY:LOT (e.g. 260101:LOT123)",
  "hibc-concatenated": "Format: LIC:PRODUCT:EXPIRY:LOT",
  "isbt-din": "Format: COUNTRY:FACILITY:YEAR:DONATION",
};

const M2D_DEFAULTS: Record<string, string> = {
  datamatrix: "Hello World",
  gs1datamatrix: "(01)12345678901231",
  pdf417: "Hello World",
  aztec: "Hello World",
  micropdf417: "Hello",
  rmqr: "HELLO",
  maxicode: "Hello MaxiCode",
  dotcode: "HELLO",
  hanxin: "Hello",
  jabcode: "Hello",
  codablockf: "HELLO WORLD",
  code16k: "HELLO",
  "gs1-composite": "(17)260101(10)BATCH01",
};

// ── Utilities ──

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const val = (id: string) => $<HTMLInputElement>(id).value;
const numVal = (id: string) => Number(val(id));
const optNum = (id: string) => {
  const v = val(id);
  return v === "" ? undefined : Number(v);
};

function renderSafe(target: HTMLElement, fn: () => string) {
  try {
    target.innerHTML = fn();
  } catch (err) {
    target.innerHTML = `<div class="error">${(err as Error).message}</div>`;
  }
}

let toastTimer: ReturnType<typeof setTimeout>;
function toast(msg: string) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2000);
}

function copySVG(svg: string) {
  navigator.clipboard.writeText(svg).then(() => toast("Copied to clipboard"));
}

function downloadSVG(svg: string, name: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.svg`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Downloaded");
}

function downloadPNG(data: Uint8Array, name: string) {
  const blob = new Blob([data], { type: "image/png" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.png`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Downloaded PNG");
}

function svgToPNG(svgString: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth * 2;
      canvas.height = img.naturalHeight * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Failed to create PNG"));
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG"));
    };
    img.src = url;
  });
}

function listen(ids: string[], fn: () => void) {
  for (const id of ids) $(id).addEventListener("input", fn);
}

// Track active preview mode per panel
const previewMode: Record<string, "svg" | "png"> = {
  bc: "svg",
  qr: "svg",
  m2d: "svg",
};

function setupPreviewToggles() {
  document.querySelectorAll<HTMLButtonElement>(".toggle-btn[data-preview]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target!;
      const mode = btn.dataset.preview as "svg" | "png";
      previewMode[target] = mode;

      // Toggle active class
      btn
        .parentElement!.querySelectorAll(".toggle-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Toggle output visibility
      const svgOut = $(`${target}-output`);
      const pngOut = $(`${target}-output-png`);
      svgOut.hidden = mode === "png";
      pngOut.hidden = mode === "svg";

      // Trigger re-render for PNG if switching
      if (mode === "png") {
        pngOut.dispatchEvent(new CustomEvent("render-png"));
      }
    });
  });
}

function renderPNGPreview(target: string, pngData: Uint8Array) {
  const el = $(`${target}-output-png`);
  const blob = new Blob([pngData], { type: "image/png" });
  const url = URL.createObjectURL(blob);
  el.innerHTML = `<img src="${url}" alt="PNG preview" style="max-width:100%;image-rendering:pixelated" />`;
}

function renderPNGPreviewFromSVG(target: string, svg: string) {
  svgToPNG(svg)
    .then((png) => {
      const el = $(`${target}-output-png`);
      const blob = new Blob([png], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      el.innerHTML = `<img src="${url}" alt="PNG preview" style="max-width:100%" />`;
    })
    .catch(() => {
      $(`${target}-output-png`).innerHTML = `<div class="error">PNG render failed</div>`;
    });
}

function setupCopyDownload(prefix: string, getFn: () => string) {
  $(`${prefix}-copy`).addEventListener("click", () => {
    try {
      copySVG(getFn());
    } catch {}
  });
  $(`${prefix}-download`).addEventListener("click", () => {
    try {
      downloadSVG(getFn(), prefix);
    } catch {}
  });
}

// ── Custom Renderers ──

function renderFourStateSVG(states: string[], color: string): string {
  const bw = 2;
  const gap = 3;
  const h = 24;
  const m = 10;
  const w = states.length * (bw + gap) - gap + m * 2;

  const bars = states
    .map((s, i) => {
      const x = m + i * (bw + gap);
      let y: number;
      let bh: number;
      switch (s) {
        case "F":
          y = 0;
          bh = h;
          break;
        case "A":
          y = 0;
          bh = h * 0.6;
          break;
        case "D":
          y = h * 0.4;
          bh = h * 0.6;
          break;
        default:
          y = h * 0.25;
          bh = h * 0.5;
          break; // T
      }
      return `<rect x="${x}" y="${y + m}" width="${bw}" height="${bh}" fill="${color}"/>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h + m * 2}" width="${w}" height="${h + m * 2}">${bars}</svg>`;
}

function renderJABCodeSVG(
  result: { matrix: number[][]; rows: number; cols: number; palette: readonly string[] },
  size: number,
): string {
  const cell = Math.max(2, Math.floor(size / Math.max(result.rows, result.cols)));
  const w = result.cols * cell;
  const h = result.rows * cell;
  let rects = "";
  for (let r = 0; r < result.rows; r++) {
    for (let c = 0; c < result.cols; c++) {
      rects += `<rect x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}" fill="${result.palette[result.matrix[r][c]]}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${rects}</svg>`;
}

// ── Tabs ──

function setupTabs() {
  const tabs = document.querySelectorAll<HTMLButtonElement>(".tab");
  const panels = document.querySelectorAll<HTMLElement>(".panel");
  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document
        .querySelector<HTMLElement>(`[data-panel="${tab.dataset.tab}"]`)!
        .classList.add("active");
    });
  }
}

// ── Barcode ──

const FOURSTATE_TYPES = new Set(["rm4scc", "kix", "australia-post", "japan-post", "imb"]);
const HEALTHCARE_TYPES = new Set([
  "hibc-primary",
  "hibc-secondary",
  "hibc-concatenated",
  "isbt-din",
  "isbt-component",
  "isbt-expiry",
  "isbt-bloodgroup",
]);

function generateBarcode(data: string, type: string, opts: any): string {
  // 4-State postal codes
  if (FOURSTATE_TYPES.has(type)) {
    let states: string[];
    switch (type) {
      case "rm4scc":
        states = encodeRM4SCC(data) as string[];
        break;
      case "kix":
        states = encodeKIX(data) as string[];
        break;
      case "australia-post": {
        const [fcc, dpid] = data.split(":");
        states = encodeAustraliaPost(fcc, dpid) as string[];
        break;
      }
      case "japan-post":
        states = encodeJapanPost(data) as string[];
        break;
      case "imb":
        states = encodeIMb(data) as string[];
        break;
      default:
        states = [];
    }
    return renderFourStateSVG(states, opts.color ?? "#000");
  }

  // Healthcare — encode to string, render as Code128
  if (HEALTHCARE_TYPES.has(type)) {
    let encoded: string;
    switch (type) {
      case "hibc-primary": {
        const [lic, product, uom] = data.split(":");
        encoded = encodeHIBCPrimary(lic, product, uom ? Number(uom) : undefined);
        break;
      }
      case "hibc-secondary": {
        const [expiry, lot] = data.split(":");
        encoded = encodeHIBCSecondary(expiry || undefined, lot || undefined);
        break;
      }
      case "hibc-concatenated": {
        const [lic, product, expiry, lot] = data.split(":");
        encoded = encodeHIBCConcatenated(lic, product, { expiry, lot });
        break;
      }
      case "isbt-din": {
        const [cc, facility, year, donation] = data.split(":");
        encoded = encodeISBT128DIN(cc, facility, year, donation);
        break;
      }
      case "isbt-component":
        encoded = encodeISBT128Component(data);
        break;
      case "isbt-expiry":
        encoded = encodeISBT128Expiry(data);
        break;
      case "isbt-bloodgroup":
        encoded = encodeISBT128BloodGroup(data);
        break;
      default:
        encoded = data;
    }
    return barcode(encoded, { ...opts, type: "code128" });
  }

  // Standard barcode types
  return barcode(data, { ...opts, type });
}

function getBarcodeOpts() {
  return {
    height: numVal("bc-height"),
    barWidth: numVal("bc-barwidth"),
    color: val("bc-color"),
    background: val("bc-bg"),
    rotation: (numVal("bc-rotation") || undefined) as any,
    showText: val("bc-showtext") === "true",
    margin: numVal("bc-margin"),
    marginTop: optNum("bc-mt"),
    marginBottom: optNum("bc-mb"),
  };
}

function renderBarcodePNGPreview() {
  try {
    const type = val("bc-type");
    const data = val("bc-data");
    const opts = getBarcodeOpts();
    if (!FOURSTATE_TYPES.has(type) && !HEALTHCARE_TYPES.has(type)) {
      const png = barcodePNG(data, {
        type: type as any,
        scale: opts.barWidth,
        height: opts.height,
        margin: opts.margin,
        color: opts.color,
        background: opts.background,
      });
      renderPNGPreview("bc", png);
    } else {
      renderPNGPreviewFromSVG("bc", generateBarcode(data, type, opts));
    }
  } catch (err) {
    $("bc-output-png").innerHTML = `<div class="error">${(err as Error).message}</div>`;
  }
}

function setupBarcode() {
  const render = () => {
    renderSafe($("bc-output"), () =>
      generateBarcode(val("bc-data"), val("bc-type"), getBarcodeOpts()),
    );
    if (previewMode.bc === "png") renderBarcodePNGPreview();
  };

  $("bc-output-png").addEventListener("render-png", renderBarcodePNGPreview);

  $("bc-type").addEventListener("change", () => {
    const type = val("bc-type");
    const def = BARCODE_DEFAULTS[type];
    if (def) $<HTMLInputElement>("bc-data").value = def;
    $("bc-hint").textContent = FORMAT_HINTS[type] ?? "";
    render();
  });

  listen(
    [
      "bc-data",
      "bc-height",
      "bc-barwidth",
      "bc-color",
      "bc-bg",
      "bc-rotation",
      "bc-showtext",
      "bc-margin",
      "bc-mt",
      "bc-mb",
    ],
    render,
  );
  setupCopyDownload("bc", () => generateBarcode(val("bc-data"), val("bc-type"), getBarcodeOpts()));

  $("bc-download-png").addEventListener("click", () => {
    try {
      const type = val("bc-type");
      const data = val("bc-data");
      const opts = getBarcodeOpts();
      // Standard barcode types that support direct PNG
      if (!FOURSTATE_TYPES.has(type) && !HEALTHCARE_TYPES.has(type)) {
        const png = barcodePNG(data, {
          type: type as any,
          scale: opts.barWidth,
          height: opts.height,
          margin: opts.margin,
          color: opts.color,
          background: opts.background,
        });
        downloadPNG(png, `barcode-${type}`);
      } else {
        // Fallback: render SVG to canvas for non-standard types
        const svg = generateBarcode(data, type, opts);
        svgToPNG(svg).then((png) => downloadPNG(png, `barcode-${type}`));
      }
    } catch {}
  });

  render();
}

// ── QR Code ──

function getQRColor(): string | GradientOptions {
  const mode = val("qr-colormode");
  if (mode === "linear")
    return {
      type: "linear",
      rotation: numVal("qr-grad-rot"),
      stops: [
        { offset: 0, color: val("qr-grad-start") },
        { offset: 1, color: val("qr-grad-end") },
      ],
    };
  if (mode === "radial")
    return {
      type: "radial",
      stops: [
        { offset: 0, color: val("qr-radial-start") },
        { offset: 1, color: val("qr-radial-end") },
      ],
    };
  return val("qr-color");
}

function getQRBg(): string | GradientOptions | "transparent" {
  const mode = val("qr-bgmode");
  if (mode === "transparent") return "transparent";
  if (mode === "linear")
    return {
      type: "linear",
      rotation: numVal("qr-bg-grad-rot"),
      stops: [
        { offset: 0, color: val("qr-bg-grad-start") },
        { offset: 1, color: val("qr-bg-grad-end") },
      ],
    };
  if (mode === "radial")
    return {
      type: "radial",
      stops: [
        { offset: 0, color: val("qr-bg-radial-start") },
        { offset: 1, color: val("qr-bg-radial-end") },
      ],
    };
  return val("qr-bg");
}

function getQRCorners() {
  const outer = val("qr-corner-outer");
  const inner = val("qr-corner-inner");
  if (!outer && !inner) return undefined;
  const c: Record<string, any> = {};
  if (outer) c.outerShape = outer;
  if (inner) c.innerShape = inner;
  const oc = val("qr-corner-color");
  const ic = val("qr-corner-inner-color");
  if (oc !== "#000000") c.outerColor = oc;
  if (ic !== "#000000") c.innerColor = ic;
  return { topLeft: c, topRight: { ...c }, bottomLeft: { ...c } };
}

function getQRLogo(): LogoOptions | undefined {
  const t = val("qr-logo-type");
  if (t === "none") return undefined;
  const logo: LogoOptions = { size: Number(val("qr-logo-size")), margin: numVal("qr-logo-margin") };
  if (t === "path") {
    const p = val("qr-logo-path");
    if (!p) return undefined;
    logo.path = p;
  } else if (t === "url") {
    const u = val("qr-logo-url");
    if (!u) return undefined;
    logo.imageUrl = u;
  }
  return logo;
}

function generateQR(): string {
  const isMicro = val("qr-micro") === "micro";
  const data = val("qr-data");

  if (isMicro) {
    const matrix = encodeMicroQR(data, { ecLevel: val("qr-ec") as any });
    return renderMatrixSVG(matrix, {
      size: numVal("qr-size"),
      color: val("qr-color"),
      margin: numVal("qr-margin"),
    });
  }

  return qrcode(data, {
    size: numVal("qr-size"),
    margin: numVal("qr-margin"),
    ecLevel: val("qr-ec") as any,
    shape: val("qr-shape") as any,
    dotType: val("qr-dot") as any,
    dotSize: Number(val("qr-dotsize")),
    color: getQRColor(),
    background: getQRBg(),
    corners: getQRCorners(),
    logo: getQRLogo(),
  });
}

function renderQRPNGPreview() {
  try {
    const data = val("qr-data");
    const isMicro = val("qr-micro") === "micro";
    if (isMicro) {
      renderPNGPreviewFromSVG("qr", generateQR());
    } else {
      const png = qrcodePNG(data, {
        ecLevel: val("qr-ec") as any,
        moduleSize: Math.max(2, Math.round(numVal("qr-size") / 30)),
        margin: numVal("qr-margin"),
        color: typeof getQRColor() === "string" ? (getQRColor() as string) : "#000000",
        background:
          typeof getQRBg() === "string" && getQRBg() !== "transparent"
            ? (getQRBg() as string)
            : "#ffffff",
      });
      renderPNGPreview("qr", png);
    }
  } catch (err) {
    $("qr-output-png").innerHTML = `<div class="error">${(err as Error).message}</div>`;
  }
}

function setupQR() {
  const render = () => {
    renderSafe($("qr-output"), generateQR);
    if (previewMode.qr === "png") renderQRPNGPreview();
  };

  $("qr-output-png").addEventListener("render-png", renderQRPNGPreview);

  // Color mode toggles
  for (const [selectId, group] of [
    ["qr-colormode", "qr-fg"],
    ["qr-bgmode", "qr-bg"],
  ] as const) {
    $(selectId).addEventListener("change", () => {
      const mode = val(selectId);
      document.querySelectorAll<HTMLElement>(`[data-colorgroup="${group}"]`).forEach((el) => {
        el.hidden = el.dataset.mode !== mode;
      });
      render();
    });
  }

  // Logo type toggle
  $("qr-logo-type").addEventListener("change", () => {
    $("qr-logo-path-wrap").hidden = val("qr-logo-type") !== "path";
    $("qr-logo-url-wrap").hidden = val("qr-logo-type") !== "url";
    render();
  });

  // Range displays
  $("qr-dotsize").addEventListener("input", () => {
    $("qr-dotsize-val").textContent = Number(val("qr-dotsize")).toFixed(1);
  });
  $("qr-logo-size").addEventListener("input", () => {
    $("qr-logo-size-val").textContent = Number(val("qr-logo-size")).toFixed(2);
  });

  listen(
    [
      "qr-data",
      "qr-size",
      "qr-margin",
      "qr-ec",
      "qr-shape",
      "qr-micro",
      "qr-dot",
      "qr-dotsize",
      "qr-color",
      "qr-bg",
      "qr-grad-start",
      "qr-grad-end",
      "qr-grad-rot",
      "qr-radial-start",
      "qr-radial-end",
      "qr-bg-grad-start",
      "qr-bg-grad-end",
      "qr-bg-grad-rot",
      "qr-bg-radial-start",
      "qr-bg-radial-end",
      "qr-corner-outer",
      "qr-corner-inner",
      "qr-corner-color",
      "qr-corner-inner-color",
      "qr-logo-path",
      "qr-logo-url",
      "qr-logo-size",
      "qr-logo-margin",
    ],
    render,
  );

  setupCopyDownload("qr", generateQR);

  $("qr-download-png").addEventListener("click", () => {
    try {
      const data = val("qr-data");
      const isMicro = val("qr-micro") === "micro";
      if (isMicro) {
        // Micro QR — fallback via SVG canvas
        svgToPNG(generateQR()).then((png) => downloadPNG(png, "qr-micro"));
      } else {
        const png = qrcodePNG(data, {
          ecLevel: val("qr-ec") as any,
          moduleSize: Math.max(2, Math.round(numVal("qr-size") / 30)),
          margin: numVal("qr-margin"),
          color: typeof getQRColor() === "string" ? (getQRColor() as string) : "#000000",
          background:
            typeof getQRBg() === "string" && getQRBg() !== "transparent"
              ? (getQRBg() as string)
              : "#ffffff",
        });
        downloadPNG(png, "qrcode");
      }
    } catch {}
  });

  render();
}

// ── 2D Codes ──

const M2D_OPTION_PANELS: Record<string, string> = {
  pdf417: "m2d-pdf417-opts",
  aztec: "m2d-aztec-opts",
  micropdf417: "m2d-mpdf-opts",
  rmqr: "m2d-rmqr-opts",
  maxicode: "m2d-maxi-opts",
  hanxin: "m2d-hanxin-opts",
  jabcode: "m2d-jab-opts",
  "gs1-composite": "m2d-composite-opts",
  codablockf: "m2d-codablockf-opts",
};

function generate2D(): string {
  const format = val("m2d-format");
  const data = val("m2d-data");
  const svgOpts = {
    size: numVal("m2d-size"),
    color: val("m2d-color"),
    background: val("m2d-bg"),
    margin: numVal("m2d-margin"),
  };

  switch (format) {
    case "datamatrix":
      return datamatrix(data, svgOpts);
    case "gs1datamatrix":
      return gs1datamatrix(data, svgOpts);
    case "pdf417":
      return pdf417(data, {
        ...svgOpts,
        width: svgOpts.size,
        ecLevel: numVal("m2d-pdf-ec"),
        columns: optNum("m2d-pdf-cols"),
        compact: val("m2d-pdf-compact") === "true",
      });
    case "aztec":
      return aztec(data, {
        ...svgOpts,
        ecPercent: numVal("m2d-az-ec"),
        layers: optNum("m2d-az-layers"),
        compact: val("m2d-az-compact") === "true",
      });
    case "micropdf417": {
      const cols = optNum("m2d-mpdf-cols");
      const r = encodeMicroPDF417(data, cols ? { columns: cols as any } : undefined);
      return renderMatrixSVG(r.matrix, svgOpts);
    }
    case "rmqr":
      return renderMatrixSVG(encodeRMQR(data, { ecLevel: val("m2d-rmqr-ec") as any }), svgOpts);
    case "maxicode":
      return renderMatrixSVG(
        encodeMaxiCode(data, { mode: numVal("m2d-maxi-mode") as any }),
        svgOpts,
      );
    case "dotcode":
      return renderMatrixSVG(encodeDotCode(data), svgOpts);
    case "hanxin":
      return renderMatrixSVG(
        encodeHanXin(data, { ecLevel: numVal("m2d-hanxin-ec") as any }),
        svgOpts,
      );
    case "jabcode":
      return renderJABCodeSVG(
        encodeJABCode(data, { colors: numVal("m2d-jab-colors") as any }),
        svgOpts.size,
      );
    case "codablockf": {
      const cols = optNum("m2d-cbf-cols");
      const r = encodeCodablockF(data, cols ? { columns: cols } : undefined);
      return renderMatrixSVG(r.matrix, svgOpts);
    }
    case "code16k":
      return renderMatrixSVG(encodeCode16K(data).matrix, svgOpts);
    case "gs1-composite":
      return renderMatrixSVG(
        encodeGS1Composite(data, val("m2d-comp-type") as any).composite,
        svgOpts,
      );
    default:
      return datamatrix(data, svgOpts);
  }
}

function render2DPNGPreview() {
  try {
    const format = val("m2d-format");
    const data = val("m2d-data");
    const pngOpts = {
      moduleSize: Math.max(2, Math.round(numVal("m2d-size") / 30)),
      margin: numVal("m2d-margin"),
      color: val("m2d-color"),
      background: val("m2d-bg"),
    };

    let png: Uint8Array | null = null;
    switch (format) {
      case "datamatrix":
        png = datamatrixPNG(data, pngOpts);
        break;
      case "gs1datamatrix":
        png = gs1datamatrixPNG(data, pngOpts);
        break;
      case "pdf417":
        png = pdf417PNG(data, {
          ...pngOpts,
          ecLevel: numVal("m2d-pdf-ec"),
          columns: optNum("m2d-pdf-cols"),
          compact: val("m2d-pdf-compact") === "true",
        });
        break;
      case "aztec":
        png = aztecPNG(data, {
          ...pngOpts,
          ecPercent: numVal("m2d-az-ec"),
          layers: optNum("m2d-az-layers"),
          compact: val("m2d-az-compact") === "true",
        });
        break;
      default:
        renderPNGPreviewFromSVG("m2d", generate2D());
        return;
    }
    if (png) renderPNGPreview("m2d", png);
  } catch (err) {
    $("m2d-output-png").innerHTML = `<div class="error">${(err as Error).message}</div>`;
  }
}

function setup2D() {
  const render = () => {
    renderSafe($("m2d-output"), generate2D);
    if (previewMode.m2d === "png") render2DPNGPreview();
  };

  $("m2d-output-png").addEventListener("render-png", render2DPNGPreview);

  $("m2d-format").addEventListener("change", () => {
    const format = val("m2d-format");
    // Hide all option panels
    for (const panelId of Object.values(M2D_OPTION_PANELS)) {
      $<HTMLDetailsElement>(panelId).hidden = true;
    }
    // Show relevant panel
    const panelId = M2D_OPTION_PANELS[format];
    if (panelId) {
      const panel = $<HTMLDetailsElement>(panelId);
      panel.hidden = false;
      panel.open = true;
    }
    // Update default data
    const def = M2D_DEFAULTS[format];
    if (def) $<HTMLInputElement>("m2d-data").value = def;
    render();
  });

  listen(
    [
      "m2d-data",
      "m2d-format",
      "m2d-size",
      "m2d-margin",
      "m2d-color",
      "m2d-bg",
      "m2d-pdf-ec",
      "m2d-pdf-cols",
      "m2d-pdf-compact",
      "m2d-az-ec",
      "m2d-az-layers",
      "m2d-az-compact",
      "m2d-mpdf-cols",
      "m2d-rmqr-ec",
      "m2d-maxi-mode",
      "m2d-hanxin-ec",
      "m2d-jab-colors",
      "m2d-comp-type",
      "m2d-cbf-cols",
    ],
    render,
  );

  setupCopyDownload("m2d", generate2D);

  $("m2d-download-png").addEventListener("click", () => {
    try {
      const format = val("m2d-format");
      const data = val("m2d-data");
      const pngOpts = {
        moduleSize: Math.max(2, Math.round(numVal("m2d-size") / 30)),
        margin: numVal("m2d-margin"),
        color: val("m2d-color"),
        background: val("m2d-bg"),
      };

      let png: Uint8Array | null = null;
      switch (format) {
        case "datamatrix":
          png = datamatrixPNG(data, pngOpts);
          break;
        case "gs1datamatrix":
          png = gs1datamatrixPNG(data, pngOpts);
          break;
        case "pdf417":
          png = pdf417PNG(data, {
            ...pngOpts,
            ecLevel: numVal("m2d-pdf-ec"),
            columns: optNum("m2d-pdf-cols"),
            compact: val("m2d-pdf-compact") === "true",
          });
          break;
        case "aztec":
          png = aztecPNG(data, {
            ...pngOpts,
            ecPercent: numVal("m2d-az-ec"),
            layers: optNum("m2d-az-layers"),
            compact: val("m2d-az-compact") === "true",
          });
          break;
        default:
          // Fallback for formats without direct PNG support
          svgToPNG(generate2D()).then((p) => downloadPNG(p, `2d-${format}`));
          return;
      }
      if (png) downloadPNG(png, `2d-${format}`);
    } catch {}
  });

  render();
}

// ── Helpers ──

const helperSVGs = new Map<string, string>();

function renderHelper(id: string, fn: () => string) {
  const target = $(`${id}-out`);
  try {
    const svg = fn();
    helperSVGs.set(id, svg);
    target.innerHTML = svg;
  } catch (err) {
    helperSVGs.delete(id);
    target.innerHTML = `<div class="error">${(err as Error).message}</div>`;
  }
}

function setupHelpers() {
  const rWifi = () =>
    renderHelper("h-wifi", () =>
      wifi(val("h-wifi-ssid"), val("h-wifi-pass"), { encryption: val("h-wifi-enc") as any }),
    );
  listen(["h-wifi-ssid", "h-wifi-pass", "h-wifi-enc"], rWifi);
  rWifi();

  const rUrl = () => renderHelper("h-url", () => url(val("h-url")));
  listen(["h-url"], rUrl);
  rUrl();

  const rEmail = () => renderHelper("h-email", () => email(val("h-email")));
  listen(["h-email"], rEmail);
  rEmail();

  const rSms = () =>
    renderHelper("h-sms", () => sms(val("h-sms-num"), val("h-sms-body") || undefined));
  listen(["h-sms-num", "h-sms-body"], rSms);
  rSms();

  const rPhone = () => renderHelper("h-phone", () => phone(val("h-phone")));
  listen(["h-phone"], rPhone);
  rPhone();

  const rGeo = () => renderHelper("h-geo", () => geo(numVal("h-geo-lat"), numVal("h-geo-lng")));
  listen(["h-geo-lat", "h-geo-lng"], rGeo);
  rGeo();

  const rVcard = () =>
    renderHelper("h-vcard", () =>
      vcard({
        firstName: val("h-vc-fn"),
        lastName: val("h-vc-ln") || undefined,
        phone: val("h-vc-phone") || undefined,
        email: val("h-vc-email") || undefined,
        org: val("h-vc-org") || undefined,
        title: val("h-vc-title") || undefined,
        url: val("h-vc-url") || undefined,
      }),
    );
  listen(
    ["h-vc-fn", "h-vc-ln", "h-vc-phone", "h-vc-email", "h-vc-org", "h-vc-title", "h-vc-url"],
    rVcard,
  );
  rVcard();

  const rMecard = () =>
    renderHelper("h-mecard", () =>
      mecard({
        name: val("h-mc-name"),
        phone: val("h-mc-phone") || undefined,
        email: val("h-mc-email") || undefined,
      }),
    );
  listen(["h-mc-name", "h-mc-phone", "h-mc-email"], rMecard);
  rMecard();

  const rEvent = () =>
    renderHelper("h-event", () =>
      event({
        title: val("h-ev-title"),
        start: val("h-ev-start"),
        end: val("h-ev-end") || undefined,
        location: val("h-ev-loc") || undefined,
      }),
    );
  listen(["h-ev-title", "h-ev-start", "h-ev-end", "h-ev-loc"], rEvent);
  rEvent();

  const rSwiss = () =>
    renderHelper("h-swiss", () =>
      swissQR({
        iban: val("h-sq-iban"),
        creditor: {
          name: val("h-sq-name"),
          postalCode: val("h-sq-zip"),
          city: val("h-sq-city"),
          country: val("h-sq-country"),
        },
        amount: numVal("h-sq-amount"),
        currency: val("h-sq-currency") as any,
      }),
    );
  listen(
    [
      "h-sq-iban",
      "h-sq-name",
      "h-sq-zip",
      "h-sq-city",
      "h-sq-country",
      "h-sq-amount",
      "h-sq-currency",
    ],
    rSwiss,
  );
  rSwiss();

  const rGS1 = () =>
    renderHelper("h-gs1", () =>
      gs1DigitalLink({
        gtin: val("h-gs1-gtin"),
        batch: val("h-gs1-batch") || undefined,
        serial: val("h-gs1-serial") || undefined,
      }),
    );
  listen(["h-gs1-gtin", "h-gs1-batch", "h-gs1-serial"], rGS1);
  rGS1();

  // Delegation for copy/download
  document.querySelectorAll<HTMLButtonElement>("[data-helper-copy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const svg = helperSVGs.get(btn.dataset.helperCopy!);
      if (svg) copySVG(svg);
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-helper-dl]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const svg = helperSVGs.get(btn.dataset.helperDl!);
      if (svg) downloadSVG(svg, btn.dataset.helperDl!);
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-helper-png]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const svg = helperSVGs.get(btn.dataset.helperPng!);
      if (svg) svgToPNG(svg).then((png) => downloadPNG(png, btn.dataset.helperPng!));
    });
  });
}

// ── Init ──

export function setupApp() {
  setupTabs();
  setupPreviewToggles();
  setupBarcode();
  setupQR();
  setup2D();
  setupHelpers();
}
