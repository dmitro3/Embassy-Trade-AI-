import { useState, useEffect } from 'react';
import { useWallet } from '@/lib/WalletProvider';
import { NETWORKS } from '@/lib/networks';
import { NETWORK_UI } from '@/constants/network';

export default function NetworkSwitcher({ onNetworkChange }) {
  const { status, walletProvider, connection, switchRpcEndpoint } = useWallet();
  const [selectedNetwork, setSelectedNetwork] = useState('mainnet');
  const [isChanging, setIsChanging] = useState(false);

  const handleNetworkChange = async (network) => {
    try {
      setIsChanging(true);
      
      if (status !== 'connected') {
        throw new Error(NETWORK_UI.ERRORS.CONNECT_WALLET_FIRST);
      }

      // Try the switch with current RPC
      try {
        await connection.getRecentBlockhash();
      } catch (err) {
        // If RPC fails, try failover
        console.warn(NETWORK_UI.ERRORS.RPC_FAILED, err);
        switchRpcEndpoint();
      }

      setSelectedNetwork(network);
      onNetworkChange?.(network);
    } catch (err) {
      console.error(NETWORK_UI.ERRORS.SWITCH_FAILED, err);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <select
        value={selectedNetwork}
        onChange={(e) => handleNetworkChange(e.target.value)}
        disabled={isChanging || status !== 'connected'}
        className="bg-gray-700 text-white rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {Object.entries(NETWORKS).map(([id, network]) => (
          network.enabled && (
            <option key={id} value={id}>
              {network.name}
            </option>
          )
        ))}
      </select>
      {isChanging && (
        <div className="text-yellow-400 text-sm">{NETWORK_UI.STATES.SWITCHING}</div>
      )}
    </div>
  );
}