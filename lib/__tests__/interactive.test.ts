import { describe, expect, it } from "vitest";
import { formatMenu, MAIN_MENU, parseMenuSelection } from "../interactive";

describe("interactive", () => {
  describe("MAIN_MENU", () => {
    it("7つのメニュー項目がある", () => {
      expect(MAIN_MENU).toHaveLength(7);
    });

    it("各項目にkey, label, description, commandがある", () => {
      for (const item of MAIN_MENU) {
        expect(item.key).toBeDefined();
        expect(item.label).toBeDefined();
        expect(item.description).toBeDefined();
        expect(item.command).toBeDefined();
      }
    });
  });

  describe("formatMenu", () => {
    it("メニューをフォーマットする", () => {
      const result = formatMenu(MAIN_MENU);
      expect(result).toContain("Interactive Mode");
      expect(result).toContain("Brainstorm");
      expect(result).toContain("TDD");
    });

    it("全ての項目を含む", () => {
      const result = formatMenu(MAIN_MENU);
      for (const item of MAIN_MENU) {
        expect(result).toContain(item.label);
      }
    });
  });

  describe("parseMenuSelection", () => {
    it("数字で選択できる", () => {
      const result = parseMenuSelection("1", MAIN_MENU);
      expect(result).not.toBeNull();
      expect(result?.label).toBe("Brainstorm");
    });

    it("ラベルで選択できる", () => {
      const result = parseMenuSelection("brainstorm", MAIN_MENU);
      expect(result).not.toBeNull();
      expect(result?.key).toBe("1");
    });

    it("大文字小文字を無視する", () => {
      const result = parseMenuSelection("BRAINSTORM", MAIN_MENU);
      expect(result).not.toBeNull();
    });

    it("無効な入力はnullを返す", () => {
      const result = parseMenuSelection("invalid", MAIN_MENU);
      expect(result).toBeNull();
    });

    it("空文字はnullを返す", () => {
      const result = parseMenuSelection("", MAIN_MENU);
      expect(result).toBeNull();
    });
  });
});
