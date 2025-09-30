import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY)
const emailDomain = import.meta.env.VITE_RESEND_EMAIL_DOMAIN || 'mail.fitstream.app'

/**
 * Send a generic email using Resend
 */
export const sendEmail = async ({ to, subject, htmlContent, fromName = 'FitStream' }) => {
  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <noreply@${emailDomain}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: htmlContent,
    })

    if (error) {
      console.error('Email sending error:', error)
      return { success: false, error }
    }

    console.log('Email sent successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Email service error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send welcome email to new users
 */
export const sendWelcomeEmail = async (userEmail, userName, userRole) => {
  const roleSpecificContent = userRole === 'trainer' 
    ? `
      <p>As a trainer, you can:</p>
      <ul>
        <li>Set up your profile and availability</li>
        <li>Manage client bookings</li>
        <li>Track your earnings</li>
        <li>Communicate with clients</li>
      </ul>
    `
    : `
      <p>As a client, you can:</p>
      <ul>
        <li>Browse and book sessions with trainers</li>
        <li>Track your progress</li>
        <li>Manage payments</li>
        <li>Chat with your trainers</li>
      </ul>
    `

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #06B6D4;">Welcome to FitStream, ${userName}!</h1>
      
      <p>We're excited to have you join our fitness community!</p>
      
      ${roleSpecificContent}
      
      <div style="margin: 30px 0;">
        <a href="https://fitstream.app/app" 
           style="background-color: #06B6D4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Get Started Now
        </a>
      </div>
      
      <p>If you have any questions, feel free to reach out to our support team.</p>
      
      <p>Best regards,<br>The FitStream Team</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #666;">
        This email was sent to ${userEmail}. If you didn't create an account with FitStream, please ignore this email.
      </p>
    </div>
  `

  return sendEmail({
    to: userEmail,
    subject: `Welcome to FitStream, ${userName}!`,
    htmlContent
  })
}

/**
 * Send booking confirmation email
 */
export const sendBookingConfirmation = async (clientEmail, trainerName, sessionDate, sessionTime) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #06B6D4;">Booking Confirmed!</h1>
      
      <p>Your training session has been successfully booked.</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Session Details:</h3>
        <p><strong>Trainer:</strong> ${trainerName}</p>
        <p><strong>Date:</strong> ${sessionDate}</p>
        <p><strong>Time:</strong> ${sessionTime}</p>
      </div>
      
      <p>You can view and manage your bookings in the FitStream app.</p>
      
      <div style="margin: 30px 0;">
        <a href="https://fitstream.app/app/messages" 
           style="background-color: #06B6D4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          View in App
        </a>
      </div>
      
      <p>Looking forward to your session!</p>
      
      <p>Best regards,<br>The FitStream Team</p>
    </div>
  `

  return sendEmail({
    to: clientEmail,
    subject: `Training Session Confirmed - ${sessionDate}`,
    htmlContent
  })
}

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (userEmail, resetLink) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #06B6D4;">Reset Your Password</h1>
      
      <p>You requested to reset your password for your FitStream account.</p>
      
      <p>Click the button below to reset your password:</p>
      
      <div style="margin: 30px 0;">
        <a href="${resetLink}" 
           style="background-color: #06B6D4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Reset Password
        </a>
      </div>
      
      <p>This link will expire in 24 hours for security reasons.</p>
      
      <p>If you didn't request this password reset, you can safely ignore this email.</p>
      
      <p>Best regards,<br>The FitStream Team</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #666;">
        This email was sent to ${userEmail}. If you didn't request a password reset, please contact support.
      </p>
    </div>
  `

  return sendEmail({
    to: userEmail,
    subject: 'Reset Your FitStream Password',
    htmlContent
  })
}

export default {
  sendEmail,
  sendWelcomeEmail,
  sendBookingConfirmation,
  sendPasswordResetEmail
}