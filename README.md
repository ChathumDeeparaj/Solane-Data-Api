# Aelora Data API

This service handles high-frequency data ingestion and retrieval for the Aelora Solar Platform (e.g., real-time energy generation readings).

## Anomaly Detection System Research & Design

### 1. Overview
This module outlines the anomaly detection logic for the Aelora solar energy platform. The system identifies irregular patterns in solar energy generation data to help users take corrective actions.

### 2. Data Model Analysis
Based on the `seed.ts` script logic and available data:
- **Data Points**: Every 2 hours (Energy Generation Record).
- **Available Fields**: `timestamp` (Date), `energyGenerated` (kWh), `serialNumber` (String).
- **Context**: Solar panels generate power during daylight (approx 06:00 - 18:00).

### 3. Anomaly Types & Detection Techniques

#### Type 1: Nighttime Generation (Sensor Malfunction)
**Description**: The system records significant energy generation during night hours when solar output should be physically impossible.
**Detection Technique**:
- **Logic**: Check if `energyGenerated` > 0.5 kWh during non-daylight hours.
- **Rule**: `IF (hour < 06:00 OR hour > 20:00) AND (energyGenerated > 0.5) THEN ANOMALY`
**Severity**: 🟡 **WARNING**
**User Impact**: Indicates sensor calibration drift, short circuit, or database corruption. User should recalibrate sensors or check wiring.

#### Type 2: Zero Generation During Peak Hours (Critical Failure)
**Description**: The system reports zero or near-zero energy generation during expected peak sunlight hours.
**Detection Technique**:
- **Logic**: Check if `energyGenerated` is negligible during peak sun window (11:00 - 13:00).
- **Rule**: `IF (hour >= 11:00 AND hour <= 13:00) AND (energyGenerated < 0.1) THEN ANOMALY`
**Severity**: 🔴 **CRITICAL**
**User Impact**: Indicates complete inverter failure, blown fuse, or grid disconnection. Immediate revenue loss. User needs to check inverter status immediately.

#### Type 3: Sudden Performance Drop
**Description**: A sharp decrease in energy generation (> 50%) compared to the immediate previous valid interval, not explained by normal sunset.
**Detection Technique**:
- **Logic**: Compare current reading ($E_t$) with previous reading ($E_{t-1}$).
- **Rule**: `IF (hour >= 09:00 AND hour <= 15:00) AND (E_t < E_{t-1} * 0.5) THEN ANOMALY`
**Severity**: 🟠 **WARNING**
**User Impact**: Suggests temporary obstruction (debris, heavy snow) or partial string failure. User should inspect panels for physical obstructions.

#### Type 4: Inverter Clipping (Capacity Limit)
**Description**: Energy production "flatlines" at the same value for multiple consecutive hours, suggesting the inverter is undersized and capping output.
**Detection Technique**:
- **Logic**: profound strictly identical values for 3+ consecutive readings.
- **Rule**: `IF (E_t == E_{t-1} == E_{t-2}) AND (E_t > 0) THEN ANOMALY`
**Severity**: 🔵 **INFO**
**User Impact**: The system is generating more power than the inverter can convert. While not a failure, the user is losing potential energy. Upgrade might be recommended.

### 4. Severity Classification Matrix

| Level | Color | Definition | Notification Strategy |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | Red | Major loss of function. Immediate action needed. | Push Notification + Dashboard Alert |
| **WARNING** | Orange | Performance degraded or data suspect. | Dashboard Alert |
| **INFO** | Blue | Optimization opportunity or minor observation. | Dashboard Note |

Backend Repo :- 

Data Api Repo :-

- Deployed links of your
    - Front-end
    - Back-end
    - Data-API
