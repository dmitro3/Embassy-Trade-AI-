import { NextResponse } from 'next/server';

// Mock database for development - in production, use a proper database
const MOCK_USERS = new Map();

export async function POST(request) {
  try {
    const { email, walletAddress, preferences } = await request.json();

    // Validate request data
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Create or update user
    const userId = `user_${Date.now()}`;
    const user = {
      id: MOCK_USERS.has(email) ? MOCK_USERS.get(email).id : userId,
      email,
      walletAddress: walletAddress || null,
      preferences: preferences || {
        notifications: true,
        autoTrade: false,
        riskLevel: 'medium'
      },
      createdAt: MOCK_USERS.has(email) 
        ? MOCK_USERS.get(email).createdAt 
        : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to mock database
    MOCK_USERS.set(email, user);

    console.log(`User ${MOCK_USERS.has(email) ? 'updated' : 'created'}: ${email}`);

    return NextResponse.json({
      message: `User ${MOCK_USERS.has(email) ? 'updated' : 'created'} successfully`,
      user: {
        id: user.id,
        email: user.email,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to create/update user' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const walletAddress = url.searchParams.get('walletAddress');

    // Must provide either email or wallet
    if (!email && !walletAddress) {
      return NextResponse.json(
        { error: 'Email or wallet address is required' },
        { status: 400 }
      );
    }

    // Find user by email or wallet address
    let user = null;
    if (email && MOCK_USERS.has(email)) {
      user = MOCK_USERS.get(email);
    } else if (walletAddress) {
      // Find by wallet address
      for (const [_, userData] of MOCK_USERS.entries()) {
        if (userData.walletAddress === walletAddress) {
          user = userData;
          break;
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return user data without sensitive information
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        preferences: user.preferences,
        walletAddress: user.walletAddress 
          ? `${user.walletAddress.substring(0, 4)}...${user.walletAddress.substring(user.walletAddress.length - 4)}`
          : null
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const { email, walletAddress, preferences } = await request.json();

    // Validate request
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    if (!MOCK_USERS.has(email)) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get existing user
    const user = MOCK_USERS.get(email);

    // Update user data
    const updatedUser = {
      ...user,
      walletAddress: walletAddress || user.walletAddress,
      preferences: preferences ? { ...user.preferences, ...preferences } : user.preferences,
      updatedAt: new Date().toISOString()
    };

    // Save updated user
    MOCK_USERS.set(email, updatedUser);

    console.log(`User updated: ${email}`);

    return NextResponse.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        preferences: updatedUser.preferences
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}