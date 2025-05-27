const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Booking = require('../models/Booking');
const { validateCoordinates } = require('../utils/validation');

// Store active connections
const activeConnections = new Map();
const driverLocations = new Map();
const activeRides = new Map();

const socketHandler = (io) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.userData = user;
      
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.userRole})`);
    
    // Store active connection
    activeConnections.set(socket.userId, {
      socketId: socket.id,
      socket: socket,
      role: socket.userRole,
      connectedAt: new Date()
    });

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);
    
    // Role-specific room joining
    if (socket.userRole === 'driver') {
      socket.join('drivers');
      handleDriverConnection(socket);
    } else if (socket.userRole === 'passenger') {
      socket.join('passengers');
      handlePassengerConnection(socket);
    } else if (socket.userRole === 'admin') {
      socket.join('admins');
      handleAdminConnection(socket);
    }

    // Common event handlers
    setupCommonEventHandlers(socket, io);
    
    // Role-specific event handlers
    if (socket.userRole === 'driver') {
      setupDriverEventHandlers(socket, io);
    } else if (socket.userRole === 'passenger') {
      setupPassengerEventHandlers(socket, io);
    } else if (socket.userRole === 'admin') {
      setupAdminEventHandlers(socket, io);
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      handleDisconnection(socket, io);
    });
  });
};

// Handle driver-specific connection logic
const handleDriverConnection = async (socket) => {
  try {
    const driver = await Driver.findOne({ userId: socket.userId });
    if (driver) {
      socket.driverId = driver._id.toString();
      socket.join(`driver_${socket.driverId}`);
      
      // Update driver status to online
      await Driver.findByIdAndUpdate(driver._id, { 
        isOnline: true,
        lastSeen: new Date()
      });

      // Emit to admins that driver is online
      socket.to('admins').emit('driver_status_update', {
        driverId: driver._id,
        status: 'online',
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error('Driver connection error:', error);
  }
};

// Handle passenger-specific connection logic
const handlePassengerConnection = async (socket) => {
  try {
    // Check for active bookings
    const activeBookings = await Booking.find({
      userId: socket.userId,
      status: { $in: ['pending', 'confirmed', 'in_progress'] }
    });

    if (activeBookings.length > 0) {
      activeBookings.forEach(booking => {
        socket.join(`booking_${booking._id}`);
        activeRides.set(booking._id.toString(), {
          passengerId: socket.userId,
          bookingId: booking._id.toString(),
          status: booking.status
        });
      });
    }
  } catch (error) {
    console.error('Passenger connection error:', error);
  }
};

// Handle admin-specific connection logic
const handleAdminConnection = async (socket) => {
  try {
    // Send current system stats
    const stats = await getSystemStats();
    socket.emit('system_stats', stats);
  } catch (error) {
    console.error('Admin connection error:', error);
  }
};

// Setup common event handlers
const setupCommonEventHandlers = (socket, io) => {
  // Heartbeat to keep connection alive
  socket.on('heartbeat', () => {
    socket.emit('heartbeat_ack', { timestamp: new Date() });
  });

  // Join specific rooms
  socket.on('join_room', (roomName) => {
    socket.join(roomName);
    socket.emit('room_joined', { room: roomName });
  });

  // Leave specific rooms
  socket.on('leave_room', (roomName) => {
    socket.leave(roomName);
    socket.emit('room_left', { room: roomName });
  });
};

// Setup driver-specific event handlers
const setupDriverEventHandlers = (socket, io) => {
  // Driver location updates
  socket.on('location_update', async (data) => {
    try {
      const { latitude, longitude, heading, speed } = data;
      
      if (!validateCoordinates(latitude, longitude)) {
        socket.emit('error', { message: 'Invalid coordinates' });
        return;
      }

      const locationData = {
        driverId: socket.driverId,
        coordinates: [longitude, latitude],
        heading: heading || 0,
        speed: speed || 0,
        timestamp: new Date()
      };

      // Store driver location
      driverLocations.set(socket.driverId, locationData);

      // Update driver location in database
      await Driver.findByIdAndUpdate(socket.driverId, {
        currentLocation: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        lastLocationUpdate: new Date()
      });

      // Broadcast to nearby passengers and active rides
      broadcastDriverLocation(socket, io, locationData);

    } catch (error) {
      console.error('Location update error:', error);
      socket.emit('error', { message: 'Failed to update location' });
    }
  });

  // Driver availability toggle
  socket.on('toggle_availability', async (data) => {
    try {
      const { isAvailable } = data;
      
      await Driver.findByIdAndUpdate(socket.driverId, {
        isAvailable: isAvailable,
        lastSeen: new Date()
      });

      socket.emit('availability_updated', { isAvailable });
      
      // Notify admins
      socket.to('admins').emit('driver_availability_change', {
        driverId: socket.driverId,
        isAvailable,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Availability toggle error:', error);
      socket.emit('error', { message: 'Failed to update availability' });
    }
  });

  // Accept/Reject ride requests
  socket.on('ride_response', async (data) => {
    try {
      const { bookingId, action, estimatedArrival } = data;
      
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        socket.emit('error', { message: 'Booking not found' });
        return;
      }

      if (action === 'accept') {
        await Booking.findByIdAndUpdate(bookingId, {
          driverId: socket.driverId,
          status: 'confirmed',
          estimatedArrival: estimatedArrival || new Date(Date.now() + 10 * 60000),
          confirmedAt: new Date()
        });

        // Join booking room
        socket.join(`booking_${bookingId}`);
        
        // Notify passenger
        io.to(`user_${booking.userId}`).emit('ride_confirmed', {
          bookingId,
          driverId: socket.driverId,
          estimatedArrival,
          driver: await Driver.findById(socket.driverId).populate('userId', 'name phone')
        });

      } else if (action === 'reject') {
        // Find another driver or mark as rejected
        io.to(`user_${booking.userId}`).emit('ride_rejected', {
          bookingId,
          message: 'Driver declined the ride. Finding another driver...'
        });
      }

    } catch (error) {
      console.error('Ride response error:', error);
      socket.emit('error', { message: 'Failed to process ride response' });
    }
  });

  // Start ride
  socket.on('start_ride', async (data) => {
    try {
      const { bookingId } = data;
      
      await Booking.findByIdAndUpdate(bookingId, {
        status: 'in_progress',
        startedAt: new Date()
      });

      // Notify passenger
      io.to(`booking_${bookingId}`).emit('ride_started', {
        bookingId,
        startedAt: new Date()
      });

      // Notify admins
      socket.to('admins').emit('ride_started_notification', {
        bookingId,
        driverId: socket.driverId,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Start ride error:', error);
      socket.emit('error', { message: 'Failed to start ride' });
    }
  });

  // Complete ride
  socket.on('complete_ride', async (data) => {
    try {
      const { bookingId, finalAmount, endLocation } = data;
      
      await Booking.findByIdAndUpdate(bookingId, {
        status: 'completed',
        completedAt: new Date(),
        finalAmount: finalAmount,
        endLocation: endLocation
      });

      // Leave booking room
      socket.leave(`booking_${bookingId}`);
      
      // Notify passenger
      io.to(`booking_${bookingId}`).emit('ride_completed', {
        bookingId,
        finalAmount,
        completedAt: new Date()
      });

      // Remove from active rides
      activeRides.delete(bookingId);

    } catch (error) {
      console.error('Complete ride error:', error);
      socket.emit('error', { message: 'Failed to complete ride' });
    }
  });
};

// Setup passenger-specific event handlers
const setupPassengerEventHandlers = (socket, io) => {
  // Request ride
  socket.on('request_ride', async (data) => {
    try {
      const { pickupLocation, dropoffLocation, vehicleType, estimatedFare } = data;
      
      // Create booking
      const booking = new Booking({
        userId: socket.userId,
        pickupLocation,
        dropoffLocation,
        vehicleType,
        estimatedFare,
        status: 'pending',
        createdAt: new Date()
      });

      await booking.save();
      
      socket.join(`booking_${booking._id}`);
      
      // Find nearby drivers
      const nearbyDrivers = await findNearbyDrivers(pickupLocation, vehicleType);
      
      if (nearbyDrivers.length === 0) {
        socket.emit('no_drivers_available', {
          bookingId: booking._id,
          message: 'No drivers available in your area'
        });
        return;
      }

      // Send ride request to nearby drivers
      nearbyDrivers.forEach(driver => {
        const driverConnection = activeConnections.get(driver.userId.toString());
        if (driverConnection) {
          driverConnection.socket.emit('ride_request', {
            bookingId: booking._id,
            passenger: socket.userData,
            pickupLocation,
            dropoffLocation,
            estimatedFare,
            vehicleType
          });
        }
      });

      socket.emit('ride_requested', {
        bookingId: booking._id,
        message: 'Looking for nearby drivers...'
      });

    } catch (error) {
      console.error('Request ride error:', error);
      socket.emit('error', { message: 'Failed to request ride' });
    }
  });

  // Cancel ride
  socket.on('cancel_ride', async (data) => {
    try {
      const { bookingId, reason } = data;
      
      await Booking.findByIdAndUpdate(bookingId, {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason
      });

      // Notify driver if assigned
      const booking = await Booking.findById(bookingId);
      if (booking.driverId) {
        io.to(`driver_${booking.driverId}`).emit('ride_cancelled', {
          bookingId,
          reason,
          cancelledBy: 'passenger'
        });
      }

      socket.leave(`booking_${bookingId}`);
      activeRides.delete(bookingId);

      socket.emit('ride_cancelled_confirmed', { bookingId });

    } catch (error) {
      console.error('Cancel ride error:', error);
      socket.emit('error', { message: 'Failed to cancel ride' });
    }
  });
};

// Setup admin-specific event handlers
const setupAdminEventHandlers = (socket, io) => {
  // Get real-time stats
  socket.on('get_realtime_stats', async () => {
    try {
      const stats = await getSystemStats();
      socket.emit('realtime_stats', stats);
    } catch (error) {
      console.error('Get stats error:', error);
      socket.emit('error', { message: 'Failed to get stats' });
    }
  });

  // Monitor specific driver
  socket.on('monitor_driver', (driverId) => {
    socket.join(`driver_monitor_${driverId}`);
    socket.emit('driver_monitoring_started', { driverId });
  });

  // Stop monitoring driver
  socket.on('stop_monitor_driver', (driverId) => {
    socket.leave(`driver_monitor_${driverId}`);
    socket.emit('driver_monitoring_stopped', { driverId });
  });
};

// Broadcast driver location to relevant parties
const broadcastDriverLocation = (socket, io, locationData) => {
  // Broadcast to passengers in active rides with this driver
  activeRides.forEach((ride, bookingId) => {
    if (ride.driverId === socket.driverId) {
      io.to(`booking_${bookingId}`).emit('driver_location_update', locationData);
    }
  });

  // Broadcast to admins monitoring this driver
  socket.to(`driver_monitor_${socket.driverId}`).emit('driver_location_update', locationData);
};

// Find nearby drivers
const findNearbyDrivers = async (pickupLocation, vehicleType, radius = 5000) => {
  try {
    const drivers = await Driver.find({
      isAvailable: true,
      isOnline: true,
      vehicleType: vehicleType,
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: pickupLocation.coordinates
          },
          $maxDistance: radius
        }
      }
    }).populate('userId', 'name phone').limit(10);

    return drivers;
  } catch (error) {
    console.error('Find nearby drivers error:', error);
    return [];
  }
};

// Get system statistics
const getSystemStats = async () => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDrivers = await Driver.countDocuments();
    const onlineDrivers = await Driver.countDocuments({ isOnline: true });
    const availableDrivers = await Driver.countDocuments({ isAvailable: true, isOnline: true });
    const activeRidesCount = await Booking.countDocuments({ status: 'in_progress' });
    const pendingRidesCount = await Booking.countDocuments({ status: 'pending' });
    
    return {
      totalUsers,
      totalDrivers,
      onlineDrivers,
      availableDrivers,
      activeRides: activeRidesCount,
      pendingRides: pendingRidesCount,
      activeConnections: activeConnections.size,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Get system stats error:', error);
    return {};
  }
};

// Handle disconnection
const handleDisconnection = async (socket, io) => {
  console.log(`User disconnected: ${socket.userId} (${socket.userRole})`);
  
  try {
    if (socket.userRole === 'driver' && socket.driverId) {
      // Update driver status to offline
      await Driver.findByIdAndUpdate(socket.driverId, {
        isOnline: false,
        lastSeen: new Date()
      });

      // Remove from driver locations
      driverLocations.delete(socket.driverId);

      // Notify admins
      socket.to('admins').emit('driver_status_update', {
        driverId: socket.driverId,
        status: 'offline',
        timestamp: new Date()
      });
    }

    // Remove from active connections
    activeConnections.delete(socket.userId);

  } catch (error) {
    console.error('Disconnection handling error:', error);
  }
};

module.exports = socketHandler;