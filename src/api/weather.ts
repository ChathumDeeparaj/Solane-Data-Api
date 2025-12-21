import { Router } from "express";

const router = Router();

interface WeatherCacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_DURATION = 3600000; // 1 hour in milliseconds
const weatherCache: Map<string, WeatherCacheEntry> = new Map();

const OPEN_METEO_API = "https://api.open-meteo.com/v1/forecast";

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    cloud_cover: number;
    wind_speed_10m: number;
  };
  hourly: {
    time: string[];
    cloud_cover: number[];
    direct_radiation: number[];
  };
}

const getWeatherDescription = (code: number): string => {
  const descriptions: { [key: number]: string } = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Foggy",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    71: "Slight Snow",
    73: "Moderate Snow",
    75: "Heavy Snow",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    85: "Slight Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Hail",
    99: "Thunderstorm with Hail",
  };
  return descriptions[code] || "Unknown";
};

const getSolarCondition = (
  cloudCover: number,
  windSpeed: number,
  weatherCode: number
): { condition: string; solarOutput: string; advice: string } => {
  // Check for severe weather
  if ([95, 96, 99].includes(weatherCode)) {
    return {
      condition: "POOR",
      solarOutput: "0-10%",
      advice: "Thunderstorms - No solar production expected",
    };
  }

  // Check for rain/snow
  if (
    weatherCode >= 51 &&
    weatherCode <= 86 &&
    ![51, 53, 55].includes(weatherCode)
  ) {
    return {
      condition: "POOR",
      solarOutput: "10-20%",
      advice: "Precipitation reducing solar output",
    };
  }

  // High wind speed impact
  if (windSpeed > 15) {
    return {
      condition: "FAIR",
      solarOutput: "40-60%",
      advice: "High winds may affect installation - reduce output expected",
    };
  }

  // Cloud cover assessment
  if (cloudCover <= 20) {
    return {
      condition: "OPTIMAL",
      solarOutput: "90-100%",
      advice: "Excellent conditions for solar energy generation",
    };
  } else if (cloudCover <= 50) {
    return {
      condition: "GOOD",
      solarOutput: "70-90%",
      advice: "Good conditions for solar energy generation",
    };
  } else if (cloudCover <= 80) {
    return {
      condition: "FAIR",
      solarOutput: "40-60%",
      advice: "Moderate cloud cover reducing solar output",
    };
  } else {
    return {
      condition: "POOR",
      solarOutput: "10-30%",
      advice: "Heavy cloud cover significantly reducing solar output",
    };
  }
};

router.get("/", async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: "Latitude and longitude are required",
      });
    }

    const cacheKey = `${latitude},${longitude}`;
    const cached = weatherCache.get(cacheKey);

    // Return cached data if available and fresh
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.status(200).json({
        ...cached.data,
        cached: true,
      });
    }

    // Fetch from Open-Meteo API
    const url = new URL(OPEN_METEO_API);
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("current", [
      "temperature_2m",
      "relative_humidity_2m",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m",
    ].join(","));
    url.searchParams.set("hourly", ["cloud_cover", "direct_radiation"].join(","));
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.statusText}`);
    }

    const data = (await response.json()) as OpenMeteoResponse;

    const solarInfo = getSolarCondition(
      data.current.cloud_cover,
      data.current.wind_speed_10m,
      data.current.weather_code
    );

    const formattedResponse = {
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      current: {
        temperature: Math.round(data.current.temperature_2m * 10) / 10,
        humidity: data.current.relative_humidity_2m,
        cloudCover: data.current.cloud_cover,
        windSpeed: Math.round(data.current.wind_speed_10m * 10) / 10,
        weatherCode: data.current.weather_code,
        weatherDescription: getWeatherDescription(data.current.weather_code),
      },
      solar: solarInfo,
      hourly: {
        cloudCover: data.hourly.cloud_cover.slice(0, 24),
        directRadiation: data.hourly.direct_radiation.slice(0, 24),
      },
      timestamp: new Date().toISOString(),
    };

    // Cache the response
    weatherCache.set(cacheKey, {
      data: formattedResponse,
      timestamp: Date.now(),
    });

    res.status(200).json(formattedResponse);
  } catch (error) {
    console.error("Weather API error:", error);
    res.status(500).json({
      error: "Failed to fetch weather data",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
