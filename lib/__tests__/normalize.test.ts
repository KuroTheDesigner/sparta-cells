import { describe, expect, it } from 'vitest';
import { normalizePhones, type RawPhone } from '@/lib/normalize';

const sample: RawPhone = {
  name: 'Test Phone',
  price: 250000,
  cpu: 'Snapdragon 8',
  battery: '5000 mAh',
  screen: 'AMOLED',
  rearCam: '50MP (Wide)\n12MP (Ultrawide)',
  frontCam: '32MP',
  refresh: '120Hz',
  size: '6.7"',
  charging: '80W',
  video: '4K@60fps',
  wireless: 'Yes (30W)',
  resolution: '1440x3200',
  headphone: 'No',
  sim: 'Dual SIM',
};

describe('normalizePhones', () => {
  it('parses numeric fields and camera modules correctly', () => {
    const [phone] = normalizePhones([sample]);

    expect(phone.batteryMah).toBe(5000);
    expect(phone.screen.sizeIn).toBeCloseTo(6.7);
    expect(phone.refreshHz).toBe(120);
    expect(phone.chargingW).toBe(80);
    expect(phone.wirelessW).toBe(30);
    expect(phone.cameras.rear).toHaveLength(2);
    expect(phone.cameras.rear?.[0]).toMatchObject({ mp: 50, type: 'Wide' });
    expect(phone.cameras.frontMp).toBe(32);
  });
});
