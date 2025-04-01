export const PRIMARY_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
export const FALLBACK_RPC_ENDPOINT = 'https://solana-mainnet.rpc.extrnode.com';

export const NETWORK_UI = {
  ERRORS: {
    CONNECT_WALLET_FIRST: 'Please connect your wallet first',
    SWITCH_FAILED: 'Failed to switch network',
    RPC_FAILED: 'RPC endpoint failed, trying alternate...',
  },
  STATES: {
    SWITCHING: 'Switching...',
    CONNECTED: 'Connected',
    DISCONNECTED: 'Disconnected',
    CONNECTING: 'Connecting...',
  },
  BUTTONS: {
    RETRY: 'Retry',
    REFRESH: 'Refresh',
    CONNECT_PHANTOM: 'Connect Phantom',
    CONNECT_SOLFLARE: 'Connect Solflare',
  },
  MESSAGES: {
    NO_WALLET: 'No wallet detected. Please install a Solana wallet.',
    INSTALL_PROMPT: 'Please install {0} wallet and refresh the page',
    CONNECTION_SUCCESS: 'Wallet connected successfully!',
    CONNECTION_ERROR: 'Failed to connect wallet',
    NETWORK_ERROR: 'Network error occurred',
  }
};