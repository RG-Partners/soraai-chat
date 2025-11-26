import Image from 'next/image';
import { Cloud, Sun, CloudRain, CloudSnow, Wind } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const WeatherWidget = () => {
  const [data, setData] = useState({
    temperature: 0,
    condition: '',
    location: '',
    humidity: 0,
    windSpeed: 0,
    icon: '',
    temperatureUnit: 'C',
    windSpeedUnit: 'm/s',
  });

  const [loading, setLoading] = useState(true);

  const getApproxLocation = useCallback(async () => {
    const res = await fetch('https://ipwhois.app/json/');
    const data = await res.json();

    return {
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city,
    };
  }, []);

  const getLocation = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return getApproxLocation();
    }

    try {
      const permissions = navigator.permissions;

      if (!permissions) {
        return getApproxLocation();
      }

      const result = await permissions.query({
        name: 'geolocation',
      });

      if (result.state === 'granted') {
        const position = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject),
        );

        const response = await fetch(
          `https://api-bdc.io/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`,
        );

        const geo = await response.json();

        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          city: geo.locality ?? '',
        };
      }

      if (result.state === 'prompt') {
        // Trigger the browser prompt but fall back immediately to approximate location.
        navigator.geolocation.getCurrentPosition(() => {});
      }

      return getApproxLocation();
    } catch (error) {
      console.error('Unable to resolve user location', error);
      return getApproxLocation();
    }
  }, [getApproxLocation]);

  const updateWeather = useCallback(async () => {
    try {
      const location = await getLocation();

      const measureUnit =
        typeof window !== 'undefined'
          ? localStorage.getItem('measureUnit') ?? 'Metric'
          : 'Metric';

      const res = await fetch(`/api/weather`, {
        method: 'POST',
        body: JSON.stringify({
          lat: location.latitude,
          lng: location.longitude,
          measureUnit,
        }),
      });

      const weather = await res.json();

      if (!res.ok) {
        console.error('Error fetching weather data');
        setLoading(false);
        return;
      }

      setData({
        temperature: weather.temperature,
        condition: weather.condition,
        location: location.city,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        icon: weather.icon,
        temperatureUnit: weather.temperatureUnit,
        windSpeedUnit: weather.windSpeedUnit,
      });
    } catch (error) {
      console.error('Failed to update weather', error);
    } finally {
      setLoading(false);
    }
  }, [getLocation]);

  useEffect(() => {
    updateWeather();
    const intervalId = setInterval(updateWeather, 30 * 1000);
    return () => clearInterval(intervalId);
  }, [updateWeather]);

  return (
    <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl border border-light-200 dark:border-dark-200 shadow-sm shadow-light-200/10 dark:shadow-black/25 flex flex-row items-center w-full h-24 min-h-[96px] max-h-[96px] px-3 py-2 gap-3">
      {loading ? (
        <>
          <div className="flex flex-col items-center justify-center w-16 min-w-16 max-w-16 h-full animate-pulse">
            <div className="h-10 w-10 rounded-full bg-light-200 dark:bg-dark-200 mb-2" />
            <div className="h-4 w-10 rounded bg-light-200 dark:bg-dark-200" />
          </div>
          <div className="flex flex-col justify-between flex-1 h-full py-1 animate-pulse">
            <div className="flex flex-row items-center justify-between">
              <div className="h-3 w-20 rounded bg-light-200 dark:bg-dark-200" />
              <div className="h-3 w-12 rounded bg-light-200 dark:bg-dark-200" />
            </div>
            <div className="h-3 w-16 rounded bg-light-200 dark:bg-dark-200 mt-1" />
            <div className="flex flex-row justify-between w-full mt-auto pt-1 border-t border-light-200 dark:border-dark-200">
              <div className="h-3 w-16 rounded bg-light-200 dark:bg-dark-200" />
              <div className="h-3 w-8 rounded bg-light-200 dark:bg-dark-200" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center justify-center w-16 min-w-16 max-w-16 h-full">
            <Image
              src={`/weather-ico/${data.icon}.svg`}
              alt={data.condition}
              width={40}
              height={40}
              className="h-10 w-auto"
            />
            <span className="text-base font-semibold text-black dark:text-white">
              {data.temperature}°{data.temperatureUnit}
            </span>
          </div>
          <div className="flex flex-col justify-between flex-1 h-full py-2">
            <div className="flex flex-row items-center justify-between">
              <span className="text-sm font-semibold text-black dark:text-white">
                {data.location}
              </span>
              <span className="flex items-center text-xs text-black/60 dark:text-white/60 font-medium">
                <Wind className="w-3 h-3 mr-1" />
                {data.windSpeed} {data.windSpeedUnit}
              </span>
            </div>
            <span className="text-xs text-black/50 dark:text-white/50 italic">
              {data.condition}
            </span>
            <div className="flex flex-row justify-between w-full mt-auto pt-2 border-t border-light-200/50 dark:border-dark-200/50 text-xs text-black/50 dark:text-white/50 font-medium">
              <span>Humidity {data.humidity}%</span>
              <span className="font-semibold text-black/70 dark:text-white/70">
                Now
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WeatherWidget;
