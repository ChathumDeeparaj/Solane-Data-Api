import cron from 'node-cron';
import { EnergyGenerationRecord } from './entities/EnergyGenerationRecord';

/**
 * Calculate realistic energy generation based on timestamp
 * Uses seasonal variations and time-of-day multipliers
 */
function calculateEnergyGeneration(timestamp: Date): number {
  const hour = timestamp.getUTCHours();
  const month = timestamp.getUTCMonth(); // 0-11

  // Base energy generation (higher in summer months)
  let baseEnergy = 200;
  if (month >= 5 && month <= 7) {
    // June-August (summer)
    baseEnergy = 300;
  } else if (month >= 2 && month <= 4) {
    // March-May (spring)
    baseEnergy = 250;
  } else if (month >= 8 && month <= 10) {
    // September-November (fall)
    baseEnergy = 200;
  } else {
    // December-February (winter)
    baseEnergy = 150;
  }

  // Adjust based on time of day (solar panels generate more during daylight)
  let timeMultiplier = 1;
  if (hour >= 6 && hour <= 18) {
    // Daylight hours
    timeMultiplier = 1.2;
    if (hour >= 10 && hour <= 14) {
      // Peak sun hours
      timeMultiplier = 1.5;
    }
  } else {
    // Night hours
    timeMultiplier = 0;
  }

  // Add some random variation (±20%)
  const variation = 0.8 + Math.random() * 0.4;
  let energyGenerated = Math.round(baseEnergy * timeMultiplier * variation);

  // --- ANOMALY INJECTION (Live Data) ---
  const anomalyChance = Math.random();

  // 1. Nighttime Generation (Sensor Malfunction)
  // Chance: 5% during night hours
  if ((hour < 6 || hour > 18) && anomalyChance < 0.05) {
    energyGenerated = Math.round(5 + Math.random() * 15);
    console.log(`[ANOMALY] Nighttime Gen detected`);
  }

  // 2. Zero Generation During Peak (Critical Failure)
  // Chance: 2% during peak hours
  if (hour >= 10 && hour <= 14 && anomalyChance >= 0.05 && anomalyChance < 0.07) {
    energyGenerated = 0;
    console.log(`[ANOMALY] Zero Peak Gen detected`);
  }

  // 3. Sudden Performance Drop (Simulated)
  // Chance: 2% during daylight
  if (hour >= 6 && hour <= 16 && anomalyChance >= 0.07 && anomalyChance < 0.09) {
    energyGenerated = Math.round(energyGenerated * 0.1);
    console.log(`[ANOMALY] Sudden Drop detected`);
  }

  // 4. Inverter Clipping
  // Chance: 1% during peak
  if (hour === 12 && anomalyChance > 0.99) {
    energyGenerated = 350;
  }

  return energyGenerated;
}

/**
 * Generate a new energy generation record for the current time
 */
async function generateNewRecord() {
  try {
    const timestamp = new Date();
    const serialNumber = process.env.SOLAR_UNIT_SERIAL || 'SU-0001';

    const energyGenerated = calculateEnergyGeneration(timestamp);

    const record = {
      serialNumber,
      timestamp,
      energyGenerated,
      intervalHours: 2,
    };

    await EnergyGenerationRecord.create(record);
    console.log(
      `[${timestamp.toISOString()}] Generated energy record: ${energyGenerated}Wh for ${serialNumber}`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Failed to generate energy record:`,
      error
    );
  }
}

/**
 * Initialize the cron scheduler to generate energy records every 2 hours
 */
export const initializeEnergyCron = () => {
  // Run every minute (for real-time demo)
  const schedule = process.env.ENERGY_CRON_SCHEDULE || '* * * * *';

  cron.schedule(schedule, async () => {
    await generateNewRecord();
  });

  console.log(
    `[Energy Cron] Scheduler initialized - Energy generation records will be created at: ${schedule}`
  );
};
