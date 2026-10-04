import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  Wind,
  Droplets,
  RefreshCw,
  MapPin,
  ChevronDown,
  Search,
  X
} from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

interface WeatherDay {
  day: string;
  code: number;
  maxTemp: number;
  minTemp: number;
}

interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  conditionText: string;
  daily: WeatherDay[];
}

interface LocationInfo {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

const DEFAULT_LOCATIONS: Record<string, LocationInfo> = {
  'Asia/Tehran': { name: 'Tehran', country: 'Iran', lat: 35.6892, lon: 51.3890 },
  'America/New_York': { name: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060 },
  'Europe/London': { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
  'Asia/Tokyo': { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
};

function resolveDefaultLocation(): LocationInfo {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (DEFAULT_LOCATIONS[tz]) return DEFAULT_LOCATIONS[tz];
    if (tz.includes('Tehran')) return { name: 'Tehran', country: 'Iran', lat: 35.6892, lon: 51.3890 };
    if (tz.includes('London')) return { name: 'London', country: 'UK', lat: 51.5074, lon: -0.1278 };
    if (tz.includes('New_York')) return { name: 'New York', country: 'USA', lat: 40.7128, lon: -74.0060 };
  } catch {
    // Fallback
  }
  return { name: 'Tehran', country: 'Iran', lat: 35.6892, lon: 51.3890 };
}

function getWeatherMeta(code: number): { text: string; type: string } {
  if (code === 0) return { text: 'Clear Sky', type: 'sun' };
  if (code === 1 || code === 2) return { text: 'Partly Cloudy', type: 'cloud-sun' };
  if (code === 3) return { text: 'Overcast', type: 'cloud' };
  if (code === 45 || code === 48) return { text: 'Foggy', type: 'fog' };
  if (code >= 51 && code <= 57) return { text: 'Drizzle', type: 'drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { text: 'Rain', type: 'rain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { text: 'Snow', type: 'snow' };
  if (code >= 95) return { text: 'Thunderstorm', type: 'thunder' };
  return { text: 'Fair', type: 'cloud-sun' };
}

interface WeatherWidgetProps {
  timeStr?: string;
  dateStr?: string;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ timeStr, dateStr }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unit, setUnit] = useState<'C' | 'F'>(() => {
    const saved = localStorage.getItem('astra_weather_unit') || localStorage.getItem('nexus_weather_unit');
    return saved === 'F' ? 'F' : 'C';
  });

  const [location, setLocation] = useState<LocationInfo>(() => {
    const saved = localStorage.getItem('astra_weather_location') || localStorage.getItem('nexus_weather_location');
    return saved ? JSON.parse(saved) : resolveDefaultLocation();
  });

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchWeather = async (loc: LocationInfo) => {
    setIsLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const current = data.current;
        const daily = data.daily;

        const days: WeatherDay[] = [];
        if (daily && daily.time) {
          const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          for (let i = 0; i < Math.min(3, daily.time.length); i++) {
            const d = new Date(daily.time[i]);
            days.push({
              day: i === 0 ? 'Today' : daysOfWeek[d.getDay()],
              code: daily.weather_code[i],
              maxTemp: daily.temperature_2m_max[i],
              minTemp: daily.temperature_2m_min[i]
            });
          }
        }

        const meta = getWeatherMeta(current.weather_code);

        setWeather({
          temp: current.temperature_2m,
          humidity: current.relative_humidity_2m,
          windSpeed: current.wind_speed_10m,
          weatherCode: current.weather_code,
          conditionText: meta.text,
          daily: days
        });
      }
    } catch (e) {
      console.warn('Weather fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchWeather(location);
    });
    const interval = setInterval(() => fetchWeather(location), 1000 * 60 * 30); // 30 mins
    return () => clearInterval(interval);
  }, [location]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
    }
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleToggleUnit = () => {
    audioEngine.playHover();
    const next = unit === 'C' ? 'F' : 'C';
    setUnit(next);
    localStorage.setItem('astra_weather_unit', next);
  };

  const formatTemp = (celsius: number) => {
    if (unit === 'F') {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${Math.round(celsius)}°C`;
  };

  const handleSearchCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);

    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        searchQuery.trim()
      )}&count=1&language=en&format=json`;
      const res = await fetch(geoUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const top = data.results[0];
          const newLoc: LocationInfo = {
            name: top.name,
            country: top.country || '',
            lat: top.latitude,
            lon: top.longitude
          };
          audioEngine.playSelect();
          setLocation(newLoc);
          localStorage.setItem('astra_weather_location', JSON.stringify(newLoc));
          setSearchQuery('');
          fetchWeather(newLoc);
        } else {
          setSearchError('City not found. Try another.');
        }
      }
    } catch {
      setSearchError('Network error searching location.');
    } finally {
      setIsSearching(false);
    }
  };

  const renderIcon = (type: string, size = 'w-4 h-4') => {
    switch (type) {
      case 'sun':
        return <Sun className={`${size} text-amber-400`} />;
      case 'cloud-sun':
        return <CloudSun className={`${size} text-amber-300`} />;
      case 'cloud':
        return <Cloud className={`${size} text-slate-300`} />;
      case 'fog':
        return <CloudFog className={`${size} text-slate-400`} />;
      case 'drizzle':
        return <CloudDrizzle className={`${size} text-cyan-300`} />;
      case 'rain':
        return <CloudRain className={`${size} text-blue-400`} />;
      case 'snow':
        return <CloudSnow className={`${size} text-sky-200`} />;
      case 'thunder':
        return <CloudLightning className={`${size} text-yellow-400`} />;
      default:
        return <Sun className={`${size} text-amber-400`} />;
    }
  };

  const currentMeta = weather ? getWeatherMeta(weather.weatherCode) : { text: 'Loading', type: 'sun' };

  return (
    <div ref={containerRef} className="relative z-50 select-none">
      {/* TopBar Compact Pill - Merged Weather & Clock */}
      <div className="flex items-center glass-pill rounded-full border border-white/10 hover:border-white/25 transition-all text-xs text-white/80 overflow-hidden shadow-sm">
        {/* Weather Segment */}
        <button
          onClick={() => {
            audioEngine.playHover();
            setIsOpen(!isOpen);
          }}
          title={`Weather in ${location.name}: ${weather ? weather.conditionText : 'Loading...'}`}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 transition-colors cursor-pointer group"
        >
          <span className="group-hover:scale-110 transition-transform">
            {renderIcon(currentMeta.type, 'w-3.5 h-3.5')}
          </span>
          <span className="font-bold text-white tracking-wide">
            {weather ? formatTemp(weather.temp) : '--'}
          </span>
          <span className="text-white/50 text-[11px] font-medium hidden sm:inline">
            {location.name}
          </span>
          <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Vertical Divider */}
        {timeStr && (
          <>
            <div className="w-[1px] h-3.5 bg-white/20 shrink-0 self-center" />

            {/* Clock & Date Segment */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 select-none font-medium">
              <span className="font-bold text-white/95 tracking-wide">{timeStr}</span>
              {dateStr && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span className="text-white/50 text-[11px] tracking-normal">{dateStr}</span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 rounded-2xl bg-[#0d121f]/95 border border-white/15 backdrop-blur-xl shadow-2xl p-4 flex flex-col gap-3 text-white animate-fadeIn z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-[var(--game-accent)] shrink-0" />
              <div className="truncate">
                <h4 className="text-xs font-bold text-white truncate">{location.name}</h4>
                {location.country && (
                  <span className="text-[10px] text-white/50 truncate block">{location.country}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleToggleUnit}
                title="Toggle °C / °F"
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/20 text-[var(--game-accent)] cursor-pointer"
              >
                °{unit}
              </button>
              <button
                onClick={() => {
                  audioEngine.playHover();
                  fetchWeather(location);
                }}
                disabled={isLoading}
                title="Refresh Forecast"
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Current Condition Hero */}
          {weather ? (
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shadow-inner">
                  {renderIcon(currentMeta.type, 'w-8 h-8')}
                </div>
                <div>
                  <div className="text-2xl font-black text-white leading-none">
                    {formatTemp(weather.temp)}
                  </div>
                  <span className="text-xs font-medium text-white/70 mt-1 block">
                    {weather.conditionText}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-col gap-1 text-[11px] text-white/60">
                <div className="flex items-center gap-1.5 justify-end">
                  <Droplets className="w-3 h-3 text-cyan-400" />
                  <span>{weather.humidity}%</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <Wind className="w-3 h-3 text-slate-300" />
                  <span>{Math.round(weather.windSpeed)} km/h</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-white/50">Fetching live weather...</div>
          )}

          {/* 3-Day Forecast Strip */}
          {weather && weather.daily && weather.daily.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10">
              {weather.daily.map((d, idx) => {
                const dayMeta = getWeatherMeta(d.code);
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center p-2 rounded-xl bg-white/5 border border-white/5 text-center gap-1"
                  >
                    <span className="text-[10px] font-semibold text-white/70">{d.day}</span>
                    {renderIcon(dayMeta.type, 'w-4 h-4')}
                    <div className="text-[10px] font-bold text-white">
                      {formatTemp(d.maxTemp)}
                    </div>
                    <div className="text-[9px] text-white/40">
                      {formatTemp(d.minTemp)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search City Form */}
          <form onSubmit={handleSearchCity} className="mt-1">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Change city (e.g. Tokyo)..."
                className="w-full px-3 py-1.5 pr-8 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[var(--game-accent)]"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 text-white/50 hover:text-white cursor-pointer"
              >
                <Search className={`w-3.5 h-3.5 ${isSearching ? 'animate-pulse text-[var(--game-accent)]' : ''}`} />
              </button>
            </div>
            {searchError && (
              <span className="text-[10px] text-rose-400 mt-1 block">{searchError}</span>
            )}
          </form>
        </div>
      )}
    </div>
  );
};
