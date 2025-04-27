/**
 * Social Butterfly Page - Embassy Trade AI
 * 
 * This page integrates the Social Butterfly component, allowing users to:
 * - Connect with other traders
 * - Chat in real-time
 * - Share trading ideas
 * - Challenge friends to arcade games
 */

import React from 'react';
import SocialButterflyClient from './client';

export const metadata = {
  title: 'Social Butterfly | Embassy Trade AI',
  description: 'Connect with other traders, share ideas, and challenge friends to games in the Arcade.',
};

export default function SocialButterflyPage() {
  return <SocialButterflyClient />;
}
