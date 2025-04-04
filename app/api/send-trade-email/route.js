import { NextResponse } from 'next/server';

// Official feedback email address
const FEEDBACK_EMAIL = 'feedback@embassyai.xyz';

/**
 * API Route to send email notifications for trade executions
 * 
 * @param {Object} req - Request object containing trade details
 * @returns {Object} Response with success status or error
 */
export async function POST(req) {
  try {
    // Parse request body
    const body = await req.json();
    const { email, trade, success, profit, walletAddress } = body;

    if (!email || !trade) {
      return NextResponse.json(
        { error: 'Missing required fields: email and trade details' },
        { status: 400 }
      );
    }

    console.log(`[Trade Email] Sending notification to ${email} for trade:`, trade);
    console.log(`[Admin Notification] Sending copy to ${FEEDBACK_EMAIL}`);

    // In a production environment, integrate with an email service like SendGrid
    // For development/simulation, we'll just log the request and return success
    
    // Example SendGrid integration (commented out)
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    // Email to the user
    const userMsg = {
      to: email,
      from: 'notifications@embassyai.xyz', // Verified sender
      subject: `Trade ${success ? 'Execution' : 'Declined'}: ${trade.tradePair}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Trade ${success ? 'Executed Successfully' : 'Declined'}</h2>
          <p>Your ${trade.action} order for ${trade.tradePair} has been ${success ? 'executed' : 'declined'}.</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px;">
            <p><strong>Type:</strong> ${trade.action}</p>
            <p><strong>Pair:</strong> ${trade.tradePair}</p>
            <p><strong>Price:</strong> $${trade.price}</p>
            ${success ? `<p><strong>Profit:</strong> $${profit}</p>` : ''}
            <p><strong>${success ? 'Executed' : 'Declined'} at:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `,
    };
    
    // Admin notification copy
    const adminMsg = {
      to: FEEDBACK_EMAIL,
      from: 'notifications@embassyai.xyz', // Verified sender
      subject: `[COPY] Trade ${success ? 'Execution' : 'Declined'} for ${email}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Trade ${success ? 'Executed' : 'Declined'} for User</h2>
          <p><strong>User:</strong> ${email}</p>
          <p><strong>Wallet:</strong> ${walletAddress || 'Not provided'}</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px;">
            <p><strong>Type:</strong> ${trade.action}</p>
            <p><strong>Pair:</strong> ${trade.tradePair}</p>
            <p><strong>Price:</strong> $${trade.price}</p>
            ${success ? `<p><strong>Profit:</strong> $${profit}</p>` : ''}
            <p><strong>${success ? 'Executed' : 'Declined'} at:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `,
    };
    
    await Promise.all([
      sgMail.send(userMsg),
      sgMail.send(adminMsg)
    ]);
    */
    
    // Record trade in logs (in a real app, this would go to a database)
    const logEntry = {
      timestamp: new Date().toISOString(),
      email,
      walletAddress: walletAddress || 'unknown',
      trade,
      success,
      profit: success ? profit : '0.00'
    };
    
    console.log('[Trade Log]', JSON.stringify(logEntry));
    
    return NextResponse.json({ 
      success: true,
      message: 'Trade notification sent successfully',
      timestamp: new Date().toISOString(),
      // For development - in production, remove the preview URL
      previewUrl: `https://api.mailersend.com/v1/email/preview/${Date.now()}?to=${email}&subject=Trade+${success ? 'Execution' : 'Declined'}`
    });
  } catch (error) {
    console.error('[Trade Email Error]', error);
    
    return NextResponse.json(
      { error: 'Failed to process trade notification', details: error.message },
      { status: 500 }
    );
  }
}