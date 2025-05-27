const Location = require('../models/Location');

const locationController = {
  // Search locations
  searchLocations: async (req, res) => {
    try {
      const { q, lat, lng, limit = 10 } = req.query;

      let query = {};
      
      if (q) {
        query.$text = { $search: q };
      }

      const locations = await Location.find(query)
        .limit(parseInt(limit))
        .sort({ isPopular: -1, name: 1 });

      // If coordinates provided, sort by distance
      if (lat && lng && locations.length > 0) {
        const sortedLocations = locations.map(location => {
          const distance = calculateDistance(
            parseFloat(lat),
            parseFloat(lng),
            location.coordinates.coordinates[1],
            location.coordinates.coordinates[0]
          );
          return { ...location.toObject(), distance };
        }).sort((a, b) => a.distance - b.distance);

        return res.json({
          success: true,
          locations: sortedLocations
        });
      }

      res.json({
        success: true,
        locations
      });
    } catch (error) {
      console.error('Search locations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search locations',
        error: error.message
      });
    }
  },

  // Get popular locations
  getPopularLocations: async (req, res) => {
    try {
      const locations = await Location.find({ isPopular: true })
        .sort({ name: 1 })
        .limit(20);

      res.json({
        success: true,
        locations
      });
    } catch (error) {
      console.error('Get popular locations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch popular locations',
        error: error.message
      });
    }
  },

  // Get nearby locations
  getNearbyLocations: async (req, res) => {
    try {
      const { lat, lng, radius = 5000, limit = 20 } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const locations = await Location.find({
        coordinates: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            $maxDistance: parseInt(radius)
          }
        }
      }).limit(parseInt(limit));

      res.json({
        success: true,
        locations
      });
    } catch (error) {
      console.error('Get nearby locations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch nearby locations',
        error: error.message
      });
    }
  },

  // Add new location
  addLocation: async (req, res) => {
    try {
      const {
        name,
        address,
        coordinates,
        type,
        city,
        state,
        country,
        zipCode
      } = req.body;

      const location = new Location({
        name,
        address,
        coordinates: {
          type: 'Point',
          coordinates: [coordinates.lng, coordinates.lat]
        },
        type,
        city,
        state,
        country,
        zipCode
      });

      await location.save();

      res.status(201).json({
        success: true,
        message: 'Location added successfully',
        location
      });
    } catch (error) {
      console.error('Add location error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add location',
        error: error.message
      });
    }
  }
};

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = locationController;