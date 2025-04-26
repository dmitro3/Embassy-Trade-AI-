/**
 * Token Discovery Page
 * 
 * This page provides access to the Token Discovery MCP server functionality
 * through the TokenDiscoveryPanel component.
 */

'use client';

import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';
import TokenDiscoveryPanel from '../../components/TokenDiscoveryPanel';
import AuthGuard from '../../components/AuthGuard';

export default function TokenDiscoveryPage() {
  return (
    <AuthGuard>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Token Discovery
          </Typography>
          <Typography variant="body1" paragraph>
            Discover new tokens on Solana, analyze their potential, and execute trades with AI-powered insights.
            This feature uses the Token Discovery MCP server to provide advanced token discovery and sniping capabilities.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <Paper sx={{ p: 2, bgcolor: '#e3f2fd', flex: '1 1 300px' }}>
              <Typography variant="h6" gutterBottom>
                🔍 Token Discovery
              </Typography>
              <Typography variant="body2">
                Scan for newly listed tokens on Solana DEXs with customizable parameters for timeframe, 
                minimum liquidity, and more.
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, bgcolor: '#e8f5e9', flex: '1 1 300px' }}>
              <Typography variant="h6" gutterBottom>
                📊 Token Analysis
              </Typography>
              <Typography variant="body2">
                Get comprehensive analysis of tokens including risk scoring, contract auditing, 
                social sentiment analysis, and trading recommendations.
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, bgcolor: '#fff8e1', flex: '1 1 300px' }}>
              <Typography variant="h6" gutterBottom>
                🚀 Token Sniping
              </Typography>
              <Typography variant="body2">
                Prepare and execute token sniping transactions with customizable parameters for 
                amount, slippage, and MEV protection.
              </Typography>
            </Paper>
          </Box>
        </Paper>
        
        <TokenDiscoveryPanel />
      </Container>
    </AuthGuard>
  );
}
