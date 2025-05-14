'use client';

import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

/**
 * WalletButton Component
 * 
 * A simple wrapper around the WalletMultiButton from @solana/wallet-adapter-react-ui
 * to avoid dynamic import issues
 */
const WalletButton = (props) => {
  return <WalletMultiButton {...props} />;
};

export default WalletButton;
