import type { Phone } from './schema';

export type StatSummary = {
  title: string;
  value: string;
  phone: string;
};

export type StatBundle = {
  battery: StatSummary;
  charging: StatSummary;
  refresh: StatSummary;
  bestValue: StatSummary;
  largestScreen: StatSummary;
  bestCamera: StatSummary;
};

const formatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

function bestBy(list: Phone[], pick: (phone: Phone) => number): Phone {
  return list.reduce((best, phone) => (pick(phone) > pick(best) ? phone : best), list[0]);
}

export function computeStats(phones: Phone[]): StatBundle | null {
  if (!phones.length) return null;

  const batteryPhone = bestBy(phones, (p) => p.batteryMah);
  const chargingPhone = bestBy(phones, (p) => p.chargingW);
  const refreshPhone = bestBy(phones, (p) => p.refreshHz);
  const largestScreen = bestBy(phones, (p) => p.screen.sizeIn);
  const bestCamera = bestBy(phones, (p) => p.cameras.rear[0]?.mp ?? 0);
  const bestValue = [...phones].sort((a, b) => a.price - b.price)[0];

  return {
    battery: {
      title: 'Best Battery',
      value: `${batteryPhone.batteryMah} mAh`,
      phone: batteryPhone.name,
    },
    charging: {
      title: 'Fastest Charging',
      value: `${chargingPhone.chargingW} W`,
      phone: chargingPhone.name,
    },
    refresh: {
      title: 'Highest Refresh',
      value: `${refreshPhone.refreshHz} Hz`,
      phone: refreshPhone.name,
    },
    bestValue: {
      title: 'Best Value',
      value: formatter.format(bestValue.price),
      phone: bestValue.name,
    },
    largestScreen: {
      title: 'Largest Screen',
      value: `${largestScreen.screen.sizeIn}"`,
      phone: largestScreen.name,
    },
    bestCamera: {
      title: 'Best Camera',
      value: `${bestCamera.cameras.rear[0]?.mp ?? 0} MP`,
      phone: bestCamera.name,
    },
  };
}
