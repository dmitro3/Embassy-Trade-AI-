'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CircularProgress, 
  Dialog,
  DialogActions,
  DialogContent, 
  DialogTitle,
  Divider, 
  FormControl, 
  FormControlLabel,
  FormGroup,
  Grid, 
  IconButton,
  InputAdornment,
  InputLabel, 
  MenuItem, 
  Paper,
  Select, 
  Slider, 
  Stack,
  Switch,
  TextField, 
  Tooltip, 
  Typography 
} from '@mui/material';
import { 
  Add, 
  ArrowForward, 
  Close, 
  Delete,
  Edit,
  PlayArrow,
  Pause,
  Save,
  Timeline,
  TrendingUp,
  TrendingDown,
  BarChart,
  DonutLarge
} from '@mui/icons-material';
import logger from '../lib/logger.js';
import tokenDiscoveryMCP from '../mcp/token-discovery-mcp/integration.js';

/**
 * AutomatedTradingWorkflow Component
 * 
 * Provides capabilities to create, manage, and monitor automated trading
 * workflows based on token discovery insights.
 */
const AutomatedTradingWorkflow = ({ selectedToken }) => {
  // Trading workflows
  const [workflows, setWorkflows] = useState([]);
  const [activeWorkflows, setActiveWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  
  // Workflow editor
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // New/edited workflow state
  const [workflowData, setWorkflowData] = useState({
    id: null,
    name: '',
    description: '',
    active: false,
    strategy: {
      type: 'opportunity_score',
      parameters: {
        minScore: 70,
        maxRiskScore: 6,
        sources: ['birdeye', 'dexscreener', 'pumpfun']
      }
    },
    entryConditions: {
      minLiquidity: 10000,
      maxLiquidity: 500000,
      priceAction: 'any',
      minPriceChangePercent: 5,
      requireVerifiedContract: false
    },
    exitConditions: {
      takeProfit: 20,
      stopLoss: 15,
      maxHoldingTime: 24, // hours
      trailingStop: false,
      trailingStopPercent: 5
    },
    riskManagement: {
      maxPositionSize: 1.0, // SOL
      maxPositionsPerDay: 5,
      maxTotalExposure: 5.0, // SOL
    },
    notifications: {
      entrySignal: true,
      exitSignal: true,
      stopLoss: true,
      takeProfit: true,
      riskAlert: true
    },
    performance: {
      totalTrades: 0,
      successfulTrades: 0,
      totalPnL: 0,
      winRate: 0,
      averageReturn: 0,
      createdAt: null,
      lastUpdated: null,
      lastExecuted: null
    }
  });
  
  // Active positions
  const [positions, setPositions] = useState([]);
  
  // Load workflows on component mount
  useEffect(() => {
    loadWorkflows();
    // Also load active positions
    loadPositions();
    
    // Simulate periodic position updates
    const intervalId = setInterval(loadPositions, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Handle creating a new workflow based on selected token
  useEffect(() => {
    if (selectedToken) {
      const newWorkflow = {
        ...workflowData,
        name: `${selectedToken.symbol} Strategy`,
        description: `Automated trading strategy for ${selectedToken.symbol} token`,
        strategy: {
          ...workflowData.strategy,
          tokenAddress: selectedToken.address,
          specificToken: true
        }
      };
      
      setWorkflowData(newWorkflow);
    }
  }, [selectedToken]);
  
  // Load saved workflows from storage or API
  const loadWorkflows = async () => {
    try {
      setIsLoading(true);
      
      // In a real implementation, you would fetch these from an API
      // For now, we'll use mock data
      const mockWorkflows = [
        {
          id: 'workflow-1',
          name: 'High Opportunity Score Strategy',
          description: 'Automatically trades tokens with high opportunity scores and low risk',
          active: true,
          strategy: {
            type: 'opportunity_score',
            parameters: {
              minScore: 80,
              maxRiskScore: 4,
              sources: ['birdeye', 'dexscreener', 'pumpfun']
            },
            specificToken: false
          },
          entryConditions: {
            minLiquidity: 20000,
            maxLiquidity: 1000000,
            priceAction: 'uptrend',
            minPriceChangePercent: 10,
            requireVerifiedContract: true
          },
          exitConditions: {
            takeProfit: 30,
            stopLoss: 10,
            maxHoldingTime: 48,
            trailingStop: true,
            trailingStopPercent: 8
          },
          riskManagement: {
            maxPositionSize: 0.5,
            maxPositionsPerDay: 3,
            maxTotalExposure: 2.0
          },
          notifications: {
            entrySignal: true,
            exitSignal: true,
            stopLoss: true,
            takeProfit: true,
            riskAlert: true
          },
          performance: {
            totalTrades: 12,
            successfulTrades: 8,
            totalPnL: 1.85,
            winRate: 66.7,
            averageReturn: 15.4,
            createdAt: '2025-04-20T14:30:00Z',
            lastUpdated: '2025-04-25T09:15:00Z',
            lastExecuted: '2025-04-26T08:45:00Z'
          }
        },
        {
          id: 'workflow-2',
          name: 'New Token Sniper',
          description: 'Targets newly listed tokens with strong initial momentum',
          active: false,
          strategy: {
            type: 'new_listings',
            parameters: {
              maxAgeHours: 24,
              minHolders: 50,
              minScoreThreshold: 65,
              sources: ['birdeye', 'dexscreener']
            },
            specificToken: false
          },
          entryConditions: {
            minLiquidity: 5000,
            maxLiquidity: 200000,
            priceAction: 'any',
            minPriceChangePercent: 0,
            requireVerifiedContract: false
          },
          exitConditions: {
            takeProfit: 50,
            stopLoss: 20,
            maxHoldingTime: 12,
            trailingStop: true,
            trailingStopPercent: 15
          },
          riskManagement: {
            maxPositionSize: 0.2,
            maxPositionsPerDay: 5,
            maxTotalExposure: 1.0
          },
          notifications: {
            entrySignal: true,
            exitSignal: true,
            stopLoss: true,
            takeProfit: true,
            riskAlert: true
          },
          performance: {
            totalTrades: 8,
            successfulTrades: 3,
            totalPnL: -0.12,
            winRate: 37.5,
            averageReturn: -1.5,
            createdAt: '2025-04-15T11:20:00Z',
            lastUpdated: '2025-04-24T16:45:00Z',
            lastExecuted: '2025-04-25T14:20:00Z'
          }
        }
      ];
      
      setWorkflows(mockWorkflows);
      setActiveWorkflows(mockWorkflows.filter(w => w.active));
    } catch (error) {
      logger.error(`Error loading automated workflows: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load active trading positions
  const loadPositions = async () => {
    try {
      // In a real implementation, you would fetch these from an API
      // For now, we'll use mock data
      const mockPositions = [
        {
          id: 'position-1',
          workflowId: 'workflow-1',
          tokenAddress: '8bpRdBaWPyw7xLjQpVrxPHiZ3UkQxNNM6gU4MbXY6MH6',
          tokenSymbol: 'HAWK',
          tokenName: 'Hawksight',
          entryPrice: 0.000245,
          currentPrice: 0.000278,
          quantity: 21458.32,
          entryTime: '2025-04-26T04:15:00Z',
          pnlPercent: 13.47,
          pnlValue: 0.17,
          stopLossPrice: 0.000208,
          takeProfitPrice: 0.000319
        },
        {
          id: 'position-2',
          workflowId: 'workflow-1',
          tokenAddress: '5DQZ14hLDxveMH7NyGmTmUTRLdGbYq18WUK1PDzLqnP4',
          tokenSymbol: 'GFI',
          tokenName: 'Gari Finance',
          entryPrice: 0.00187,
          currentPrice: 0.00163,
          quantity: 1235.45,
          entryTime: '2025-04-25T21:30:00Z',
          pnlPercent: -12.83,
          pnlValue: -0.08,
          stopLossPrice: 0.00159,
          takeProfitPrice: 0.00243
        }
      ];
      
      setPositions(mockPositions);
    } catch (error) {
      logger.error(`Error loading active positions: ${error.message}`);
    }
  };
  
  // Open dialog to create a new workflow
  const handleCreateWorkflow = () => {
    setEditingWorkflow(null);
    setWorkflowData({
      ...workflowData,
      id: null,
      name: selectedToken ? `${selectedToken.symbol} Strategy` : 'New Trading Strategy',
      description: selectedToken ? `Automated strategy for ${selectedToken.symbol}` : 'Automated trading workflow',
      strategy: {
        ...workflowData.strategy,
        tokenAddress: selectedToken?.address,
        specificToken: !!selectedToken
      }
    });
    setIsDialogOpen(true);
  };
  
  // Open dialog to edit an existing workflow
  const handleEditWorkflow = (workflow) => {
    setEditingWorkflow(workflow);
    setWorkflowData({...workflow});
    setIsDialogOpen(true);
  };
  
  // Save workflow (create or update)
  const handleSaveWorkflow = async () => {
    try {
      setIsLoading(true);
      
      const now = new Date().toISOString();
      const updatedWorkflow = {
        ...workflowData,
        id: workflowData.id || `workflow-${Date.now()}`,
        performance: {
          ...workflowData.performance,
          createdAt: workflowData.performance.createdAt || now,
          lastUpdated: now
        }
      };
      
      // Update workflows list
      if (editingWorkflow) {
        // Updating existing workflow
        setWorkflows(prev => prev.map(w => w.id === updatedWorkflow.id ? updatedWorkflow : w));
      } else {
        // Creating new workflow
        setWorkflows(prev => [...prev, updatedWorkflow]);
      }
      
      // Update active workflows if needed
      if (updatedWorkflow.active) {
        setActiveWorkflows(prev => {
          const existing = prev.findIndex(w => w.id === updatedWorkflow.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = updatedWorkflow;
            return updated;
          } else {
            return [...prev, updatedWorkflow];
          }
        });
      } else {
        setActiveWorkflows(prev => prev.filter(w => w.id !== updatedWorkflow.id));
      }
      
      // Close dialog
      setIsDialogOpen(false);
      
      // In a real implementation, you would save to an API
      // await api.saveWorkflow(updatedWorkflow);
      
    } catch (error) {
      logger.error(`Error saving workflow: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete a workflow
  const handleDeleteWorkflow = async (workflowId) => {
    try {
      setIsLoading(true);
      
      // Update workflows list
      setWorkflows(prev => prev.filter(w => w.id !== workflowId));
      setActiveWorkflows(prev => prev.filter(w => w.id !== workflowId));
      
      // In a real implementation, you would delete via an API
      // await api.deleteWorkflow(workflowId);
      
    } catch (error) {
      logger.error(`Error deleting workflow: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle workflow active status
  const handleToggleWorkflowActive = async (workflow) => {
    try {
      const updatedWorkflow = {...workflow, active: !workflow.active};
      
      // Update workflows list
      setWorkflows(prev => prev.map(w => w.id === workflow.id ? updatedWorkflow : w));
      
      // Update active workflows
      if (updatedWorkflow.active) {
        setActiveWorkflows(prev => [...prev, updatedWorkflow]);
      } else {
        setActiveWorkflows(prev => prev.filter(w => w.id !== workflow.id));
      }
      
      // In a real implementation, you would update via an API
      // await api.updateWorkflow(updatedWorkflow);
      
    } catch (error) {
      logger.error(`Error toggling workflow status: ${error.message}`);
    }
  };
  
  // Handle workflow data changes
  const handleWorkflowDataChange = (field, value) => {
    // Handle nested fields using dot notation (e.g., "strategy.parameters.minScore")
    const fields = field.split('.');
    if (fields.length === 1) {
      setWorkflowData({...workflowData, [field]: value});
    } else {
      const newData = {...workflowData};
      let current = newData;
      
      // Navigate to the nested object
      for (let i = 0; i < fields.length - 1; i++) {
        current = current[fields[i]];
      }
      
      // Set the value
      current[fields[fields.length - 1]] = value;
      setWorkflowData(newData);
    }
  };
  
  // Close position (simulate)
  const handleClosePosition = async (positionId) => {
    try {
      // In a real implementation, you would close via an API
      // await api.closePosition(positionId);
      
      // For now, just remove from the UI
      setPositions(prev => prev.filter(p => p.id !== positionId));
      
    } catch (error) {
      logger.error(`Error closing position: ${error.message}`);
    }
  };
  
  // Render workflow card
  const renderWorkflowCard = (workflow) => {
    // Find active positions for this workflow
    const workflowPositions = positions.filter(p => p.workflowId === workflow.id);
    const hasPositions = workflowPositions.length > 0;
    
    // Calculate total PnL for positions
    const totalPnL = workflowPositions.reduce((sum, pos) => sum + pos.pnlValue, 0);
    
    return (
      <Card key={workflow.id} sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Box>
              <Typography variant="h6">{workflow.name}</Typography>
              <Typography variant="body2" color="text.secondary">{workflow.description}</Typography>
            </Box>
            <Box>
              <Tooltip title={workflow.active ? "Active" : "Inactive"}>
                <Switch
                  checked={workflow.active}
                  onChange={() => handleToggleWorkflowActive(workflow)}
                  color="primary"
                />
              </Tooltip>
              <IconButton size="small" onClick={() => handleEditWorkflow(workflow)}>
                <Edit fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => handleDeleteWorkflow(workflow.id)}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          
          <Divider sx={{ my: 1 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Strategy Type</Typography>
              <Typography variant="body1">
                {workflow.strategy.type === 'opportunity_score' ? 'Opportunity Score' : 
                 workflow.strategy.type === 'new_listings' ? 'New Listings' : 
                 workflow.strategy.type}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Min Score</Typography>
              <Typography variant="body1">{workflow.strategy.parameters.minScore}/100</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Take Profit</Typography>
              <Typography variant="body1">{workflow.exitConditions.takeProfit}%</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Stop Loss</Typography>
              <Typography variant="body1">{workflow.exitConditions.stopLoss}%</Typography>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 1 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">Win Rate</Typography>
              <Typography variant="body1">{workflow.performance.winRate.toFixed(1)}%</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">Total Trades</Typography>
              <Typography variant="body1">{workflow.performance.totalTrades}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">Total PnL</Typography>
              <Typography 
                variant="body1"
                color={workflow.performance.totalPnL >= 0 ? 'success.main' : 'error.main'}
              >
                {workflow.performance.totalPnL >= 0 ? '+' : ''}{workflow.performance.totalPnL.toFixed(2)} SOL
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">Avg Return</Typography>
              <Typography 
                variant="body1"
                color={workflow.performance.averageReturn >= 0 ? 'success.main' : 'error.main'}
              >
                {workflow.performance.averageReturn >= 0 ? '+' : ''}{workflow.performance.averageReturn.toFixed(1)}%
              </Typography>
            </Grid>
          </Grid>
          
          {hasPositions && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>Active Positions</Typography>
              
              <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                {workflowPositions.map(position => (
                  <Paper key={position.id} variant="outlined" sx={{ p: 1, mb: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {position.tokenSymbol} ({position.quantity.toFixed(0)})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Entry: ${position.entryPrice.toFixed(6)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography 
                          variant="body2"
                          color={position.pnlPercent >= 0 ? 'success.main' : 'error.main'}
                        >
                          {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                        </Typography>
                        <Button 
                          size="small" 
                          variant="outlined"
                          onClick={() => handleClosePosition(position.id)}
                        >
                          Close
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
              
              <Box display="flex" justifyContent="flex-end" alignItems="center" mt={1}>
                <Typography variant="body2" sx={{ mr: 1 }}>Total:</Typography>
                <Typography 
                  variant="body1"
                  color={totalPnL >= 0 ? 'success.main' : 'error.main'}
                >
                  {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} SOL
                </Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    );
  };
  
  // Render workflow editor dialog
  const renderWorkflowEditorDialog = () => {
    return (
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingWorkflow ? 'Edit Trading Strategy' : 'Create Trading Strategy'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Basic Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Strategy Name"
                  value={workflowData.name}
                  onChange={(e) => handleWorkflowDataChange('name', e.target.value)}
                  variant="outlined"
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={workflowData.active}
                      onChange={(e) => handleWorkflowDataChange('active', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Active"
                  sx={{ mt: 2 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={workflowData.description}
                  onChange={(e) => handleWorkflowDataChange('description', e.target.value)}
                  variant="outlined"
                  margin="normal"
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Strategy Parameters</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="strategy-type-label">Strategy Type</InputLabel>
                  <Select
                    labelId="strategy-type-label"
                    value={workflowData.strategy.type}
                    label="Strategy Type"
                    onChange={(e) => handleWorkflowDataChange('strategy.type', e.target.value)}
                  >
                    <MenuItem value="opportunity_score">Opportunity Score</MenuItem>
                    <MenuItem value="new_listings">New Listings</MenuItem>
                    <MenuItem value="momentum">Momentum</MenuItem>
                    <MenuItem value="whale_tracking">Whale Tracking</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <TextField
                    label="Minimum Score"
                    type="number"
                    value={workflowData.strategy.parameters.minScore}
                    onChange={(e) => handleWorkflowDataChange('strategy.parameters.minScore', Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">/100</InputAdornment>,
                      inputProps: { min: 0, max: 100 }
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <TextField
                    label="Maximum Risk Score"
                    type="number"
                    value={workflowData.strategy.parameters.maxRiskScore}
                    onChange={(e) => handleWorkflowDataChange('strategy.parameters.maxRiskScore', Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">/10</InputAdornment>,
                      inputProps: { min: 1, max: 10 }
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={workflowData.strategy.specificToken || false}
                      onChange={(e) => handleWorkflowDataChange('strategy.specificToken', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Specific Token Only"
                  sx={{ mt: 2 }}
                />
              </Grid>
            </Grid>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Entry Conditions</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <TextField
                    label="Minimum Liquidity"
                    type="number"
                    value={workflowData.entryConditions.minLiquidity}
                    onChange={(e) => handleWorkflowDataChange('entryConditions.minLiquidity', Number(e.target.value))}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <TextField
                    label="Maximum Liquidity"
                    type="number"
                    value={workflowData.entryConditions.maxLiquidity}
                    onChange={(e) => handleWorkflowDataChange('entryConditions.maxLiquidity', Number(e.target.value))}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="price-action-label">Price Action</InputLabel>
                  <Select
                    labelId="price-action-label"
                    value={workflowData.entryConditions.priceAction}
                    label="Price Action"
                    onChange={(e) => handleWorkflowDataChange('entryConditions.priceAction', e.target.value)}
                  >
                    <MenuItem value="any">Any</MenuItem>
                    <MenuItem value="uptrend">Uptrend</MenuItem>
                    <MenuItem value="downtrend">Downtrend</MenuItem>
                    <MenuItem value="breakout">Breakout</MenuItem>
                    <MenuItem value="reversal">Reversal</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <TextField
                    label="Minimum Price Change"
                    type="number"
                    value={workflowData.entryConditions.minPriceChangePercent}
                    onChange={(e) => handleWorkflowDataChange('entryConditions.minPriceChangePercent', Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={workflowData.entryConditions.requireVerifiedContract}
                      onChange={(e) => handleWorkflowDataChange('entryConditions.requireVerifiedContract', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Require Verified Contract"
                />
              </Grid>
            </Grid>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Exit Conditions & Risk Management</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <TextField
                    label="Take Profit"
                    type="number"
                    value={workflowData.exitConditions.takeProfit}
                    onChange={(e) => handleWorkflowDataChange('exitConditions.takeProfit', Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <TextField
                    label="Stop Loss"
                    type="number"
                    value={workflowData.exitConditions.stopLoss}
                    onChange={(e) => handleWorkflowDataChange('exitConditions.stopLoss', Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <TextField
                    label="Maximum Holding Time"
                    type="number"
                    value={workflowData.exitConditions.maxHoldingTime}
                    onChange={(e) => handleWorkflowDataChange('exitConditions.maxHoldingTime', Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={workflowData.exitConditions.trailingStop}
                      onChange={(e) => handleWorkflowDataChange('exitConditions.trailingStop', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Use Trailing Stop"
                  sx={{ mt: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <TextField
                    label="Max Position Size"
                    type="number"
                    value={workflowData.riskManagement.maxPositionSize}
                    onChange={(e) => handleWorkflowDataChange('riskManagement.maxPositionSize', Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">SOL</InputAdornment>,
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <TextField
                    label="Max Total Exposure"
                    type="number"
                    value={workflowData.riskManagement.maxTotalExposure}
                    onChange={(e) => handleWorkflowDataChange('riskManagement.maxTotalExposure', Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">SOL</InputAdornment>,
                    }}
                  />
                </FormControl>
              </Grid>
            </Grid>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box>
            <Typography variant="subtitle2" gutterBottom>Notifications</Typography>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Switch
                    checked={workflowData.notifications.entrySignal}
                    onChange={(e) => handleWorkflowDataChange('notifications.entrySignal', e.target.checked)}
                    color="primary"
                  />
                }
                label="Entry Signals"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={workflowData.notifications.exitSignal}
                    onChange={(e) => handleWorkflowDataChange('notifications.exitSignal', e.target.checked)}
                    color="primary"
                  />
                }
                label="Exit Signals"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={workflowData.notifications.stopLoss}
                    onChange={(e) => handleWorkflowDataChange('notifications.stopLoss', e.target.checked)}
                    color="primary"
                  />
                }
                label="Stop Loss"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={workflowData.notifications.takeProfit}
                    onChange={(e) => handleWorkflowDataChange('notifications.takeProfit', e.target.checked)}
                    color="primary"
                  />
                }
                label="Take Profit"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={workflowData.notifications.riskAlert}
                    onChange={(e) => handleWorkflowDataChange('notifications.riskAlert', e.target.checked)}
                    color="primary"
                  />
                }
                label="Risk Alerts"
              />
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveWorkflow} 
            variant="contained" 
            color="primary"
            startIcon={<Save />}
            disabled={!workflowData.name || isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Save Strategy'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };
  
  return (
    <Box>
      {/* Header section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Automated Trading Workflows</Typography>
          <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={handleCreateWorkflow}
          >
            Create Strategy
          </Button>
        </Box>
      </Paper>
      
      {/* Active positions section */}
      {positions.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Active Positions ({positions.length})
          </Typography>
          
          <Grid container spacing={2}>
            {positions.map((position) => (
              <Grid item xs={12} sm={6} md={4} key={position.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6">{position.tokenSymbol}</Typography>
                      <Typography 
                        variant="body1"
                        color={position.pnlPercent >= 0 ? 'success.main' : 'error.main'}
                      >
                        {position.pnlPercent >= 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                        {position.pnlPercent.toFixed(2)}%
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">{position.tokenName}</Typography>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Entry Price</Typography>
                        <Typography variant="body2">${position.entryPrice.toFixed(6)}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Current Price</Typography>
                        <Typography variant="body2">${position.currentPrice.toFixed(6)}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Quantity</Typography>
                        <Typography variant="body2">{position.quantity.toLocaleString()}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">P&L Value</Typography>
                        <Typography 
                          variant="body2" 
                          color={position.pnlValue >= 0 ? 'success.main' : 'error.main'}
                        >
                          {position.pnlValue >= 0 ? '+' : ''}{position.pnlValue.toFixed(2)} SOL
                        </Typography>
                      </Grid>
                    </Grid>
                    
                    <Box display="flex" justifyContent="center" mt={1.5}>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        size="small" 
                        fullWidth
                        onClick={() => handleClosePosition(position.id)}
                      >
                        Close Position
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
      
      {/* Trading strategies */}
      <Grid container spacing={2}>
        {/* Active strategies */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Active Strategies ({activeWorkflows.length})
          </Typography>
          
          {activeWorkflows.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No active trading strategies
              </Typography>
              <Button 
                variant="outlined" 
                startIcon={<Add />}
                onClick={handleCreateWorkflow}
                sx={{ mt: 2 }}
              >
                Create Strategy
              </Button>
            </Paper>
          ) : (
            activeWorkflows.map(renderWorkflowCard)
          )}
        </Grid>
        
        {/* Inactive strategies */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Inactive Strategies ({workflows.length - activeWorkflows.length})
          </Typography>
          
          {workflows.length - activeWorkflows.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No inactive trading strategies
              </Typography>
            </Paper>
          ) : (
            workflows
              .filter(w => !w.active)
              .map(renderWorkflowCard)
          )}
        </Grid>
      </Grid>
      
      {/* Workflow editor dialog */}
      {renderWorkflowEditorDialog()}
    </Box>
  );
};

export default AutomatedTradingWorkflow;
