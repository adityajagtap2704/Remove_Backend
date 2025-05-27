const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      const mailOptions = {
        from: `"CabGo" <${process.env.FROM_EMAIL}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(userEmail, userName) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to CabGo!</h2>
        <p>Hi ${userName},</p>
        <p>Welcome to CabGo! We're excited to have you on board.</p>
        <p>You can now book rides, track your trips, and enjoy a seamless transportation experience.</p>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Happy riding!</p>
        <p>The CabGo Team</p>
      </div>
    `;
    
    return this.sendEmail(userEmail, 'Welcome to CabGo!', html);
  }

  async sendBookingConfirmation(userEmail, bookingDetails) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Booking Confirmed</h2>
        <p>Your ride has been booked successfully!</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Booking Details:</h3>
          <p><strong>Booking ID:</strong> ${bookingDetails.id}</p>
          <p><strong>Pickup:</strong> ${bookingDetails.pickup}</p>
          <p><strong>Dropoff:</strong> ${bookingDetails.dropoff}</p>
          <p><strong>Estimated Fare:</strong> $${bookingDetails.fare}</p>
          <p><strong>Vehicle Type:</strong> ${bookingDetails.vehicleType}</p>
        </div>
        <p>Your driver will arrive shortly. Track your ride in the CabGo app.</p>
      </div>
    `;
    
    return this.sendEmail(userEmail, 'Ride Booked - CabGo', html);
  }

  async sendRideComplete(userEmail, rideDetails) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Ride Completed</h2>
        <p>Thank you for riding with CabGo!</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Trip Summary:</h3>
          <p><strong>Ride ID:</strong> ${rideDetails.id}</p>
          <p><strong>Driver:</strong> ${rideDetails.driverName}</p>
          <p><strong>Total Fare:</strong> $${rideDetails.totalFare}</p>
          <p><strong>Distance:</strong> ${rideDetails.distance} km</p>
          <p><strong>Duration:</strong> ${rideDetails.duration}</p>
        </div>
        <p>We hope you had a great experience. Please rate your ride in the app!</p>
      </div>
    `;
    
    return this.sendEmail(userEmail, 'Trip Completed - CabGo', html);
  }

  async sendPasswordReset(userEmail, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>You requested a password reset for your CabGo account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: #2563eb; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          If you didn't request this, please ignore this email. This link will expire in 1 hour.
        </p>
      </div>
    `;
    
    return this.sendEmail(userEmail, 'Password Reset - CabGo', html);
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }
}

module.exports = new EmailService();