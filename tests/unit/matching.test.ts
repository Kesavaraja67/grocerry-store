import { describe, it, expect } from "vitest";
import { phoneticKey, rankMatches } from "@/server/domain/matching";

describe("Domain: Matching & Phonetics", () => {
  describe("phoneticKey", () => {
    it("normalizes thenga and thengai to the same key", () => {
      expect(phoneticKey("thengai")).toBe(phoneticKey("thenga"));
    });

    it("normalizes thenga ennai and thengai ennai to the same key", () => {
      expect(phoneticKey("thenga ennai")).toBe(phoneticKey("thengai ennai"));
    });

    it("normalizes double consonants (paruppu vs parupu)", () => {
      expect(phoneticKey("paruppu")).toBe(phoneticKey("parupu"));
    });

    it("normalizes th vs t (thoor vs toor)", () => {
      expect(phoneticKey("thoor dal")).toBe(phoneticKey("toor dal"));
    });
  });

  describe("rankMatches", () => {
    const products = [
      {
        id: "1",
        name: "Coconut Oil",
        nameTamil: "தேங்காய் எண்ணெய்",
        aliases: ["thengai ennai", "thenga ennai", "kera oil"],
      },
      {
        id: "2",
        name: "Ponni Boiled Rice",
        nameTamil: "பொன்னி புழுங்கல் அரிசி",
        aliases: ["ponni arisi", "rice", "arisi"],
      },
      {
        id: "3",
        name: "Toor Dal",
        nameTamil: "துவரம் பருப்பு",
        aliases: ["thuvaram paruppu", "toor parupu"],
      },
      {
        id: "4",
        name: "Gingelly / Sesame Oil",
        nameTamil: "நல்லெண்ணெய்",
        aliases: ["nalla ennai", "til oil"],
      },
    ];

    it("matches 'thenga ennai' to Coconut Oil via alias phonetics", () => {
      const results = rankMatches("thenga ennai", products);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("1");
    });

    it("matches 'thengai ennai' to Coconut Oil", () => {
      const results = rankMatches("thengai ennai", products);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("1");
    });

    it("matches 'arisi' to Ponni Boiled Rice", () => {
      const results = rankMatches("arisi", products);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("2");
    });

    it("matches 'rice' to Ponni Boiled Rice", () => {
      const results = rankMatches("rice", products);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("2");
    });

    it("matches Tamil script 'அரிசி' to Ponni Boiled Rice", () => {
      const results = rankMatches("அரிசி", products);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("2");
    });

    it("matches Tamil script 'தேங்காய்' to Coconut Oil", () => {
      const results = rankMatches("தேங்காய்", products);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("1");
    });
  });
});

