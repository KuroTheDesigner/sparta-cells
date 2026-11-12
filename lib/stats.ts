import type { Phone } from "./schema";
import { formatCurrency } from "./format";

export type StatSummary = { title: string; value: string; phone: string };
export type StatBundle = {
  battery: StatSummary;
  charging: StatSummary;
  refresh: StatSummary;
  bestValue: StatSummary;
  largestScreen: StatSummary;
  bestCamera: StatSummary;
};

export function computeStats(
  phones: Phone[],
  currency = "NGN",
): StatBundle | null {
  if (!phones.length) return null;
  const highest = (
    title: string,
    pick: (phone: Phone) => number | null,
    format: (value: number) => string,
  ): StatSummary => {
    let winner: Phone | undefined,
      value: number | null = null;
    for (const phone of phones) {
      const candidate = pick(phone);
      if (candidate !== null && (value === null || candidate > value)) {
        winner = phone;
        value = candidate;
      }
    }
    return {
      title,
      value: value === null ? "Unknown" : format(value),
      phone: winner?.name || "No sourced value",
    };
  };
  const cheapest = phones.filter((phone): phone is Phone & {price: number} => phone.price !== null).sort((a, b) => a.price - b.price)[0];
  return {
    battery: highest(
      "Best Battery",
      (p) => p.batteryMah,
      (v) => `${v} mAh`,
    ),
    charging: highest(
      "Fastest Charging",
      (p) => p.chargingW,
      (v) => `${v} W`,
    ),
    refresh: highest(
      "Highest Refresh",
      (p) => p.refreshHz,
      (v) => `${v} Hz`,
    ),
    bestValue: {
      title: "Best Value",
      value: formatCurrency(cheapest?.price ?? null, currency),
      phone: cheapest?.name ?? "No sourced price",
    },
    largestScreen: highest(
      "Largest Screen",
      (p) => p.screen.sizeIn,
      (v) => `${v}"`,
    ),
    bestCamera: highest(
      "Best Camera",
      (p) => p.cameras.rear?.[0]?.mp ?? null,
      (v) => `${v} MP`,
    ),
  };
}
