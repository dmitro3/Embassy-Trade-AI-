import { useState, useEffect } from 'react';

export default function ReferralProgram({ userId, walletAddress }) {
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadReferralData = async () => {
      if (!walletAddress) return;
      setLoading(true);
      try {
        // In production, this would be an API call
        // Mock data for demonstration
        await new Promise(resolve => setTimeout(resolve, 1000));
        setReferralCode(`EMB${walletAddress.slice(2, 8)}`);
        setReferrals([
          {
            address: '0xabc...def',
            username: 'Trader123',
            joinedAt: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
            trades: 15,
            volume: 25000,
            rewardsEarned: 75
          },
          {
            address: '0x123...456',
            username: 'CryptoFan',
            joinedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            trades: 5,
            volume: 8000,
            rewardsEarned: 25
          }
        ]);
        setTotalEarned(100);
      } catch (err) {
        console.error('Failed to load referral data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReferralData();
  }, [walletAddress]);

  const copyReferralLink = async () => {
    const referralLink = `https://embassy.trade/ref/${referralCode}`;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!walletAddress) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <p className="text-gray-400">Connect your wallet to access the referral program</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold text-blue-400 mb-6">Referral Program</h2>

      {/* Referral Info */}
      <div className="bg-gray-700/50 p-4 rounded-lg mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm text-gray-300 mb-1">Your Referral Code</p>
            <p className="text-2xl font-bold text-blue-400">{referralCode}</p>
          </div>
          <button
            onClick={copyReferralLink}
            className={`px-4 py-2 rounded ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 bg-gray-700/50 rounded">
            <p className="text-2xl font-bold text-yellow-400">{totalEarned}</p>
            <p className="text-sm text-gray-400">EMB Earned</p>
          </div>
          <div className="p-3 bg-gray-700/50 rounded">
            <p className="text-2xl font-bold text-blue-400">{referrals.length}</p>
            <p className="text-sm text-gray-400">Active Referrals</p>
          </div>
        </div>
      </div>

      {/* Rewards Tiers */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-300 mb-4">Rewards Tiers</h3>
        <div className="grid gap-3">
          <div className="p-3 bg-gray-700/30 rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Basic</span>
              <span className="text-yellow-400">5% EMB rewards</span>
            </div>
            <p className="text-sm text-gray-400">
              Earn 5% of trading fees from referred users
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-blue-400">Pro</span>
              <span className="text-yellow-400">10% EMB rewards</span>
            </div>
            <p className="text-sm text-gray-400">
              10% rewards after 5 active referrals
            </p>
          </div>
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-purple-400">Elite</span>
              <span className="text-yellow-400">15% EMB rewards</span>
            </div>
            <p className="text-sm text-gray-400">
              15% rewards after 20 active referrals
            </p>
          </div>
        </div>
      </div>

      {/* Referral List */}
      {referrals.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-300 mb-4">Your Referrals</h3>
          <div className="space-y-3">
            {referrals.map((referral) => (
              <div
                key={referral.address}
                className="p-3 bg-gray-700/30 rounded"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{referral.username}</p>
                    <p className="text-sm text-gray-400">
                      Joined {new Date(referral.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400">+{referral.rewardsEarned} EMB</p>
                    <p className="text-sm text-gray-400">
                      {referral.trades} trades • ${referral.volume.toLocaleString()} volume
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referral Tips */}
      <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
        <h4 className="text-sm font-medium text-blue-400 mb-2">Tips to Earn More</h4>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-center">
            <span className="text-yellow-400 mr-2">•</span>
            Share your referral link on social media
          </li>
          <li className="flex items-center">
            <span className="text-yellow-400 mr-2">•</span>
            Help your referrals succeed with trading tips
          </li>
          <li className="flex items-center">
            <span className="text-yellow-400 mr-2">•</span>
            Create content about your trading experience
          </li>
        </ul>
      </div>
    </div>
  );
}