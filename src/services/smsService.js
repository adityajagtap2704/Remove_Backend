const twilio = require('twilio');

class SMSService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  async sendSMS(to, message) {
    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: to
      });

      return {
        success: true,
        messageId: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendVerificationCode(phoneNumber, code) {
    const message = `Your CabGo verification code is: ${code}. This code will expire in 10 minutes.`;
    return this.sendSMS(phoneNumber, message);
  }

  async sendBookingConfirmation(phoneNumber, driverName, vehicleInfo, eta) {
    const message = `CabGo: Your ride is confirmed! Driver: ${driverName}, Vehicle: ${vehicleInfo}, ETA: ${eta} minutes.`;
    return this.sendSMS(phoneNumber, message);
  }

  async sendDriverArrival(phoneNumber, driverName, vehicleInfo) {
    const message = `CabGo: Your driver ${driverName} has arrived! Look for ${vehicleInfo}.`;
    return this.sendSMS(phoneNumber, message);
  }

  async sendRideStarted(phoneNumber, driverName, estimatedArrival) {
    const message = `CabGo: Your ride with ${driverName} has started. Estimated arrival: ${estimatedArrival}.`;
    return this.sendSMS(phoneNumber, message);
  }

  async sendRideCompleted(phoneNumber, fareAmount, receiptUrl) {
    const message = `CabGo: Ride completed! Total fare: $${fareAmount}. View receipt: ${receiptUrl}`;
    return this.sendSMS(phoneNumber, message);
  }

  async sendEmergencyAlert(phoneNumber, location, rideId) {
    const message = `CabGo EMERGENCY: Alert triggered for ride ${rideId} at location: ${location}. Help is on the way.`;
    return this.sendSMS(phoneNumber, message);
  }

  async sendPasswordReset(phoneNumber, resetCode) {
    const message = `CabGo: Your password reset code is: ${resetCode}. This code will expire in 15 minutes.`;
    return this.sendSMS(phoneNumber, message);
  }

  // Generate verification code
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  // Format phone number
  formatPhoneNumber(phoneNumber) {
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present
    if (cleaned.length === 10 && !phoneNumber.startsWith('+')) {
      return `+1${cleaned}`;
    }
    
    return phoneNumber.startsWith('+') ? phoneNumber : `+${cleaned}`;
  }
}

module.exports = new SMSService();