import { describe, expect, it } from "vitest";
import { barcode, qrcode, datamatrix } from "../src/index";
import { escapeAttr } from "../src/renderers/svg/utils";

describe("SVG injection prevention", () => {
  const maliciousColor = '#000" onload="alert(1)';
  const maliciousBackground = '#fff" onclick="alert(2)';
  const maliciousFont = 'monospace" onload="alert(3)';

  describe("escapeAttr utility", () => {
    it("escapes double quotes", () => {
      expect(escapeAttr('#000" onload="alert(1)')).toBe("#000&quot; onload=&quot;alert(1)");
    });

    it("escapes ampersands", () => {
      expect(escapeAttr("a&b")).toBe("a&amp;b");
    });

    it("escapes single quotes", () => {
      expect(escapeAttr("a'b")).toBe("a&#39;b");
    });

    it("escapes angle brackets", () => {
      expect(escapeAttr("<script>")).toBe("&lt;script&gt;");
    });

    it("escapes all dangerous characters together", () => {
      expect(escapeAttr(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
    });

    it("leaves safe strings unchanged", () => {
      expect(escapeAttr("#ff0000")).toBe("#ff0000");
      expect(escapeAttr("red")).toBe("red");
      expect(escapeAttr("monospace")).toBe("monospace");
    });
  });

  describe("barcode", () => {
    it("does not allow attribute breakout via color", () => {
      const svg = barcode("test", { color: maliciousColor });
      // The raw double-quote should never appear unescaped in the fill attribute.
      // After escaping, the fill value contains &quot; instead of literal ",
      // so the attribute cannot be terminated early to inject onload.
      expect(svg).not.toContain(`fill="${maliciousColor}"`);
      expect(svg).toContain(`fill="#000&quot; onload=&quot;alert(1)"`);
    });

    it("does not allow attribute breakout via background", () => {
      const svg = barcode("test", { background: maliciousBackground });
      expect(svg).not.toContain(`fill="${maliciousBackground}"`);
      expect(svg).toContain(`fill="#fff&quot; onclick=&quot;alert(2)"`);
    });

    it("does not allow attribute breakout via fontFamily", () => {
      const svg = barcode("test", {
        showText: true,
        text: "hello",
        fontFamily: maliciousFont,
      });
      expect(svg).not.toContain(`font-family="${maliciousFont}"`);
      expect(svg).toContain(`font-family="monospace&quot; onload=&quot;alert(3)"`);
    });

    it("works correctly with normal hex colors", () => {
      const svg = barcode("test", { color: "#ff0000", background: "#eee" });
      expect(svg).toContain("<svg");
      expect(svg).toContain('fill="#ff0000"');
      expect(svg).toContain('fill="#eee"');
    });

    it("works correctly with named colors", () => {
      const svg = barcode("test", { color: "red", background: "white" });
      expect(svg).toContain('fill="red"');
      expect(svg).toContain('fill="white"');
    });
  });

  describe("qrcode", () => {
    it("does not allow attribute breakout via color", () => {
      const svg = qrcode("test", { color: maliciousColor });
      // The raw unescaped malicious value must not appear in a fill attribute
      expect(svg).not.toContain(`fill="${maliciousColor}"`);
      expect(svg).toContain("&quot;");
    });

    it("does not allow attribute breakout via background", () => {
      const svg = qrcode("test", { background: maliciousBackground });
      expect(svg).not.toContain(`fill="${maliciousBackground}"`);
      expect(svg).toContain("&quot;");
    });

    it("works correctly with normal hex colors", () => {
      const svg = qrcode("test", { color: "#333", background: "#fff" });
      expect(svg).toContain("<svg");
      expect(svg).toContain("#333");
      expect(svg).toContain("#fff");
    });
  });

  describe("datamatrix", () => {
    it("does not allow attribute breakout via color", () => {
      const svg = datamatrix("test", { color: maliciousColor });
      expect(svg).not.toContain(`fill="${maliciousColor}"`);
      expect(svg).toContain("&quot;");
    });

    it("does not allow attribute breakout via background", () => {
      const svg = datamatrix("test", { background: maliciousBackground });
      expect(svg).not.toContain(`fill="${maliciousBackground}"`);
      expect(svg).toContain("&quot;");
    });
  });
});
