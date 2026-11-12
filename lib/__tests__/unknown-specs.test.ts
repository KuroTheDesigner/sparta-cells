import { describe, expect, it } from "vitest";
import { Phone } from "../schema";
import {
  applyFilters,
  buildFilterOptions,
  createInitialFilters,
} from "../filters";
import { computeStats } from "../stats";
import { formatCurrency } from "../format";

const known = Phone.parse({
  name: "Known phone",
  price: 100,
  cpu: "Chipset",
  batteryMah: 5000,
  screen: { tech: "OLED", sizeIn: 6.5, resolution: "1080p" },
  cameras: { rear: [{ mp: 50, type: "wide" }], frontMp: 12 },
  refreshHz: 120,
  chargingW: 45,
  wirelessW: 0,
  video: "4K",
  features: { headphone: false, sim: "Dual SIM" },
});
const unknown = Phone.parse({
  ...known,
  name: "Partially sourced phone",
  cpu: null,
  batteryMah: null,
  refreshHz: null,
  chargingW: null,
  wirelessW: null,
  screen: { tech: null, sizeIn: null, resolution: null },
  cameras: { rear: null, frontMp: null },
  features: { headphone: null, sim: null },
});

describe("truthful unknown specifications", () => {
  it("retains unknown prices in broad results but excludes them from budgets and price rankings", () => {
    const unpriced = {...unknown, price: null};
    const higher = {...known, name: 'Higher price', price: 200};
    const phones = [unpriced, known, higher];
    const filters = createInitialFilters(phones);
    expect(filters.priceRange).toEqual([100,200]);
    expect(buildFilterOptions(phones).priceRange).toEqual([100,200]);
    expect(applyFilters(phones,filters)).toHaveLength(3);
    expect(applyFilters(phones,{...filters,priceRange:[100,150]})).toEqual([known]);
    expect(applyFilters(phones,{...filters,priceRange:[0,300]})).toEqual([known,higher]);
    expect(computeStats(phones)?.bestValue.phone).toBe(known.name);
    expect(computeStats([unpriced])?.bestValue.value).toBe('Price unavailable');
    expect(formatCurrency(null,'USD')).toBe('Price unavailable');
    expect(createInitialFilters([unpriced]).priceRange).toEqual([0,0]);
    expect(applyFilters([unpriced],createInitialFilters([unpriced]))).toEqual([unpriced]);
  });
  it("keeps a partially sourced phone in an unrestricted list but never treats unknown wireless as No", () => {
    const phones = [known, unknown],
      filters = createInitialFilters(phones);
    expect(applyFilters(phones, filters)).toHaveLength(2);
    expect(
      applyFilters(phones, { ...filters, wireless: new Set(["No"]) }).map(
        (p) => p.name,
      ),
    ).toEqual([known.name]);
    expect(
      applyFilters(phones, { ...filters, wireless: new Set(["Yes"]) }),
    ).toEqual([]);
  });
  it("omits unknown options and excludes unknown specs from active numeric or text selections", () => {
    const phones = [known, unknown],
      filters = createInitialFilters(phones),
      options = buildFilterOptions(phones);
    expect(options.cpu).toEqual(["Chipset"]);
    expect(options.batteryMah).toEqual([5000]);
    expect(options.chargingW).toEqual([45]);
    expect(options.screenTech).toEqual(["OLED"]);
    expect(
      applyFilters(phones, { ...filters, batteryMah: new Set([5000]) }).map(
        (p) => p.name,
      ),
    ).toEqual([known.name]);
    expect(
      applyFilters(phones, { ...filters, cpu: new Set(["Chipset"]) }).map(
        (p) => p.name,
      ),
    ).toEqual([known.name]);
    expect(
      applyFilters(phones, { ...filters, chargingW: new Set([0]) }),
    ).toEqual([]);
  });
  it("ranks only known measurements and says Unknown when no measurement is sourced", () => {
    expect(computeStats([unknown, known])?.battery.phone).toBe(known.name);
    const stats = computeStats([unknown]);
    expect(stats?.battery.value).toBe("Unknown");
    expect(stats?.charging.value).toBe("Unknown");
    expect(stats?.bestCamera.value).toBe("Unknown");
    expect(stats?.bestValue.value).not.toContain("Unknown");
  });
});
