'use server'

const API_KEY = process.env.OPENWEATHERMAP_API_KEY!
const BASE_URL = process.env.OPENWEATHERMAP_BASE_URL!

export async function fetchWeather(lat: number, lng: number) {
  try {
    const response = await fetch(
      `${BASE_URL}/current.json?key=${API_KEY}&q=${lat},${lng}&aqi=no`,
      { cache: 'no-store' }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch weather data')
    }

    const data = await response.json()
    
    return {
      windSpeed: data.current.wind_kph / 3.6, // Convert km/h to m/s
      windDirection: data.current.wind_degree,
      temperature: data.current.temp_c,
      condition: data.current.condition.text,
      error: null,
    }
  } catch (error) {
    console.error('Error fetching weather:', error)
    return {
      windSpeed: 0,
      windDirection: 0,
      temperature: 0,
      condition: '',
      error: 'Failed to fetch weather data',
    }
  }
}
