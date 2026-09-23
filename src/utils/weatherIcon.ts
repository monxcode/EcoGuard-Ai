import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";

const ICON_CODE_MAP: Record<string, LucideIcon> = {
  "01d": Sun,
  "01n": Moon,
  "02d": CloudSun,
  "02n": CloudMoon,
  "03d": Cloud,
  "03n": Cloud,
  "04d": Cloud,
  "04n": Cloud,
  "09d": CloudRain,
  "09n": CloudRain,
  "10d": CloudRain,
  "10n": CloudRain,
  "11d": CloudLightning,
  "11n": CloudLightning,
  "13d": CloudSnow,
  "13n": CloudSnow,
  "50d": CloudFog,
  "50n": CloudFog,
};

const CONDITION_MAP: Array<[RegExp, LucideIcon]> = [
  [/(thunder|storm)/i, CloudLightning],
  [/(snow)/i, CloudSnow],
  [/(rain|drizzle|shower)/i, CloudRain],
  [/(fog|mist|haze|smoke|dust)/i, CloudFog],
  [/(overcast|cloud)/i, Cloud],
  [/(clear|sun)/i, CloudSun],
];

/**
 * Map an OpenWeather icon code (preferred) or condition string to a Lucide icon.
 * Falls back to Cloud — never invents a weather-specific glyph.
 */
export function weatherIcon(
  icon: string | null | undefined,
  condition: string | null | undefined,
): LucideIcon {
  if (icon && ICON_CODE_MAP[icon]) return ICON_CODE_MAP[icon];
  if (condition) {
    for (const [pattern, component] of CONDITION_MAP) {
      if (pattern.test(condition)) return component;
    }
  }
  return Cloud;
}
