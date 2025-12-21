import mongoose from "mongoose";
import { EnergyGenerationRecord } from "./entities/EnergyGenerationRecord";
import dotenv from "dotenv";
import { connectDB } from "./db";

dotenv.config();

async function seed() {

  const serialNumber = "SU-0001";

  try {
    // Connect to DB
    await connectDB();

    // Clear existing data
    await EnergyGenerationRecord.deleteMany({});

    // Create historical energy generation records from Aug 1, 2025 8pm to Oct 12, 2025 8am every 2 hours
    const records = [];
    const startDate = new Date("2025-08-01T08:00:00Z"); // August 1, 2025 8pm UTC
    const endDate = new Date("2025-12-13T08:00:00Z"); // November 23, 2025 8am UTC

    let currentDate = new Date(startDate);
    let recordCount = 0;

    while (currentDate <= endDate) {
      // Generate realistic energy values based on time of day and season
      const hour = currentDate.getUTCHours();
      const month = currentDate.getUTCMonth(); // 0-11

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
        timeMultiplier = 0; // Minimal generation at night
      }

      // Add some random variation (±20%)
      const variation = 0.8 + Math.random() * 0.4;
      let energyGenerated = Math.round(
        baseEnergy * timeMultiplier * variation
      );

      // --- ANOMALY INJECTION ---
      const anomalyChance = Math.random();

      // 1. Nighttime Generation (Sensor Malfunction)
      // Chance: 5% during night hours
      if ((hour < 6 || hour > 18) && anomalyChance < 0.05) {
        energyGenerated = Math.round(5 + Math.random() * 15); // Random 5-20 kWh at night
        console.log(`[ANOMALY] Nighttime Gen at ${currentDate.toISOString()}: ${energyGenerated} kWh`);
      }

      // 2. Zero Generation During Peak (Critical Failure)
      // Chance: 2% during peak hours
      if (hour >= 10 && hour <= 14 && anomalyChance >= 0.05 && anomalyChance < 0.07) {
        energyGenerated = 0;
        console.log(`[ANOMALY] Zero Peak Gen at ${currentDate.toISOString()}`);
      }

      // 3. Sudden Performance Drop
      // Chance: 2% during daylight
      if (hour >= 6 && hour <= 16 && anomalyChance >= 0.07 && anomalyChance < 0.09) {
        energyGenerated = Math.round(energyGenerated * 0.1); // Drop to 10%
        console.log(`[ANOMALY] Sudden Drop at ${currentDate.toISOString()}: ${energyGenerated} kWh`);
      }

      // 4. Inverter Clipping (Capacity Limit)
      // Chance: 1% during peak
      if (hour === 12 && anomalyChance > 0.99) {
        energyGenerated = 350;
      }
      // Simple clipping simulation persistence
      if (records.length > 0 && records[records.length - 1].energyGenerated === 350 && Math.random() > 0.3) {
        energyGenerated = 350;
      }

      records.push({
        serialNumber: serialNumber,
        timestamp: new Date(currentDate),
        energyGenerated: energyGenerated,
      });

      // Move to next 2-hour interval
      currentDate = new Date(currentDate.getTime() + 2 * 60 * 60 * 1000);
      recordCount++;
    }
    await EnergyGenerationRecord.insertMany(records);

    console.log(
      `Database seeded successfully. Generated ${recordCount} energy generation records from ${startDate.toUTCString()} to ${endDate.toUTCString()}.`
    );
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
