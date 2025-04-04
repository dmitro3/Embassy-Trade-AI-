// API route for handling user feedback submissions

import { NextResponse } from 'next/server';

// Mock database for development - in production, use a proper database
const FEEDBACK_ITEMS = [];

// Official feedback email address
const FEEDBACK_EMAIL = 'feedback@embassyai.xyz';

export async function POST(request) {
  try {
    const { feedback, email, walletAddress, rating, feedbackType } = await request.json();

    // Support both simple feedback string and structured feedback
    const message = feedback || '';
    
    // Create feedback entry with simplified structure if using the simulation page form
    const feedbackEntry = {
      id: `feedback_${Date.now()}`,
      email: email || null,
      walletAddress: walletAddress || null,
      rating: rating || 5,
      feedbackType: feedbackType || 'general',
      message: message,
      createdAt: new Date().toISOString(),
      status: 'unread'
    };

    // Save feedback to mock database
    FEEDBACK_ITEMS.push(feedbackEntry);

    console.log(`Feedback received: ${message}`);
    console.log(`From: ${email || walletAddress || 'anonymous user'}`);
    
    // In a production environment, send an email to the feedback address
    // Using the SendGrid pattern from the trade email API
    
    // For development/demonstration purposes, log how this would work:
    console.log(`[Email would be sent to ${FEEDBACK_EMAIL}]`);
    console.log(`Subject: New Feedback from Embassy Trading Platform`);
    console.log(`Body: 
      Feedback: ${message}
      From: ${email || 'Not provided'}
      Wallet: ${walletAddress || 'Not provided'}
      Rating: ${rating || 'Not provided'}
      Type: ${feedbackType || 'general'}
      Time: ${new Date().toLocaleString()}
    `);
    
    // For actual email sending, uncomment and configure:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: FEEDBACK_EMAIL,
      from: 'notifications@embassyai.xyz', // Verified sender
      subject: 'New Feedback from Embassy Trading Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Feedback Submitted</h2>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px;">
            <p><strong>Feedback:</strong> ${message}</p>
            <p><strong>From:</strong> ${email || 'Not provided'}</p>
            <p><strong>Wallet:</strong> ${walletAddress || 'Not provided'}</p>
            <p><strong>Rating:</strong> ${rating || 'Not provided'}</p>
            <p><strong>Type:</strong> ${feedbackType || 'general'}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `,
    };
    
    await sgMail.send(msg);
    */

    // Return success response
    return NextResponse.json({
      message: 'Feedback submitted successfully',
      feedbackId: feedbackEntry.id
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // This endpoint would typically be protected with authentication
    // For demo purposes, we'll allow access without auth

    // Optional filtering
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const minRating = parseInt(url.searchParams.get('minRating') || '1', 10);
    const maxRating = parseInt(url.searchParams.get('maxRating') || '5', 10);
    const status = url.searchParams.get('status');

    // Apply filters
    let filteredFeedback = [...FEEDBACK_ITEMS];

    if (type) {
      filteredFeedback = filteredFeedback.filter(item => item.feedbackType === type);
    }

    if (minRating && maxRating) {
      filteredFeedback = filteredFeedback.filter(
        item => item.rating >= minRating && item.rating <= maxRating
      );
    }

    if (status) {
      filteredFeedback = filteredFeedback.filter(item => item.status === status);
    }

    // Sort by newest first
    filteredFeedback.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      feedback: filteredFeedback.map(item => ({
        ...item,
        // Mask email for privacy
        email: item.email ? `${item.email.substring(0, 3)}...${item.email.split('@')[1]}` : null,
        // Mask wallet address for privacy
        walletAddress: item.walletAddress 
          ? `${item.walletAddress.substring(0, 4)}...${item.walletAddress.substring(item.walletAddress.length - 4)}`
          : null
      }))
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

// Update feedback status (e.g., mark as read)
export async function PUT(request) {
  try {
    const { feedbackId, status } = await request.json();

    // Validate input
    if (!feedbackId) {
      return NextResponse.json(
        { error: 'Feedback ID is required' },
        { status: 400 }
      );
    }

    // Find the feedback entry
    const feedbackIndex = FEEDBACK_ITEMS.findIndex(item => item.id === feedbackId);
    
    if (feedbackIndex === -1) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Update status
    FEEDBACK_ITEMS[feedbackIndex] = {
      ...FEEDBACK_ITEMS[feedbackIndex],
      status: status || 'read',
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      message: 'Feedback status updated',
      feedback: {
        id: FEEDBACK_ITEMS[feedbackIndex].id,
        status: FEEDBACK_ITEMS[feedbackIndex].status
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    );
  }
}