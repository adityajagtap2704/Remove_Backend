const axios = require('axios');

class MapService {
  constructor() {
    this.baseUrl = 'https://api.openrouteservice.org/v2';
    this.apiKey = process.env.OPENROUTE_API_KEY;
  }

  // Calculate distance and duration between two points
  async calculateRoute(startCoords, endCoords) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/directions/driving-car`,
        {
          coordinates: [startCoords, endCoords],
          format: 'json'
        },
        {
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const route = response.data.routes[0];
      return {
        distance: Math.round(route.summary.distance / 1000), // Convert to km
        duration: Math.round(route.summary.duration / 60), // Convert to minutes
        geometry: route.geometry,
        coordinates: route.geometry
      };
    } catch (error) {
      console.error('Route calculation error:', error);
      // Fallback calculation using Haversine formula
      return this.calculateDistanceFallback(startCoords, endCoords);
    }
  }

  // Fallback distance calculation using Haversine formula
  calculateDistanceFallback(coord1, coord2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(coord2[1] - coord1[1]);
    const dLon = this.deg2rad(coord2[0] - coord1[0]);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(coord1[1])) * Math.cos(this.deg2rad(coord2[1])) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return {
      distance: Math.round(distance),
      duration: Math.round(distance * 2.5), // Estimate: 2.5 min per km
      geometry: null,
      coordinates: [coord1, coord2]
    };
  }

  // Geocode address to coordinates
  async geocodeAddress(address) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/geocode/search`,
        {
          params: {
            api_key: this.apiKey,
            text: address,
            size: 1
          }
        }
      );

      if (response.data.features.length > 0) {
        const feature = response.data.features[0];
        return {
          coordinates: feature.geometry.coordinates,
          address: feature.properties.label,
          success: true
        };
      }
      
      return { success: false, error: 'Address not found' };
    } catch (error) {
      console.error('Geocoding error:', error);
      return { success: false, error: 'Geocoding service unavailable' };
    }
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(coordinates) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/geocode/reverse`,
        {
          params: {
            api_key: this.apiKey,
            'point.lon': coordinates[0],
            'point.lat': coordinates[1],
            size: 1
          }
        }
      );

      if (response.data.features.length > 0) {
        return {
          address: response.data.features[0].properties.label,
          success: true
        };
      }
      
      return { success: false, error: 'Location not found' };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return { success: false, error: 'Geocoding service unavailable' };
    }
  }

  // Find nearby drivers within radius
  async findNearbyDrivers(centerCoords, radiusKm = 5) {
    // This would typically query your database for drivers
    // For now, returning mock data structure
    return {
      drivers: [],
      center: centerCoords,
      radius: radiusKm
    };
  }

  // Calculate fare based on distance and time
  calculateFare(distance, duration, vehicleType = 'standard') {
    const baseFare = {
      standard: { base: 3.0, perKm: 1.5, perMin: 0.25 },
      premium: { base: 5.0, perKm: 2.0, perMin: 0.35 },
      luxury: { base: 8.0, perKm: 3.0, perMin: 0.50 }
    };

    const rates = baseFare[vehicleType] || baseFare.standard;
    const fare = rates.base + (distance * rates.perKm) + (duration * rates.perMin);
    
    return {
      baseFare: rates.base,
      distanceFare: distance * rates.perKm,
      timeFare: duration * rates.perMin,
      totalFare: Number(fare.toFixed(2)),
      breakdown: {
        distance: `${distance} km @ $${rates.perKm}/km`,
        time: `${duration} min @ $${rates.perMin}/min`,
        base: `Base fare: $${rates.base}`
      }
    };
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }
}

module.exports = new MapService();