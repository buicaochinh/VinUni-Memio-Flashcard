import { cn } from "../utils";

describe("cn (class name merger)", () => {
  test("returns a single class name unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  test("merges multiple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  test("deduplicates conflicting Tailwind classes (last wins)", () => {
    // twMerge resolves conflicts: later class wins
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  test("handles conditional classes via objects", () => {
    expect(cn({ active: true, disabled: false })).toBe("active");
  });

  test("handles arrays of class names", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  test("filters out falsy values", () => {
    expect(cn("foo", false && "bar", null, undefined, "baz")).toBe("foo baz");
  });

  test("returns empty string when no classes provided", () => {
    expect(cn()).toBe("");
  });

  test("handles mixed inputs", () => {
    const result = cn("base", { active: true, hidden: false }, ["extra"]);
    expect(result).toBe("base active extra");
  });
});
