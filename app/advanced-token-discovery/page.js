'use client';

import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';
import AdvancedTokenDiscovery from '../../components/AdvancedTokenDiscovery';
import AuthGuard from '../../components/AuthGuard';

/**
 * Advanced Token Discovery Page
 * 
 * This page provides a sophisticated interface for discovering, analyzing,
 * and trading new tokens using advanced visualizations and risk assessment.
 */
export default function AdvancedTokenDiscoveryPage() {
  return (
    <AuthGuard>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Advanced Token Discovery
          </Typography>
          <Typography variant="body1" paragraph>
            Discover new tokens on Solana, analyze their potential, and execute trades with AI-powered insights.
            This feature uses the Token Discovery MCP server with advanced risk assessment and opportunity scoring.
          </Typography>
          
          <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
            <Paper sx={{ p: 2, bgcolor: '#e3f2fd', flex: '1 1 300px' }}>
              <Typography variant="h6" gutterBottom>
                🔍 Multi-Source Discovery
              </Typography>
              <Typography variant="body2">
                Find opportunities across BirdEye, DexScreener, PumpFun, and other Solana platforms.
              </Typography>
            </Paper>
            
            <Paper sx={{ p: 2, bgcolor: '#e8f5e9', flex: '1 1 300px' }}>
              <Typography variant="h6" gutterBottom>
                📊 Advanced Risk Assessment
              </Typography>
              <Typography variant="body2">
                Comprehensive risk analysis with contract audit, liquidity, and volatility metrics.
              </Typography>
            </Paper>
            
            <Paper sx={{ p: 2, bgcolor: '#fff8e1', flex: '1 1 300px' }}>
              <Typography variant="h6" gutterBottom>
                🤖 Automated Trading
              </Typography>
              <Typography variant="body2">
                Set up automated trading workflows with custom entry/exit criteria.
              </Typography>
            </Paper>
          </Box>
        </Paper>
        
        <AdvancedTokenDiscovery />
      </Container>
    </AuthGuard>
  );
}
