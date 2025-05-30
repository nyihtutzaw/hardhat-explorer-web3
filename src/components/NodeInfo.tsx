import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { AccountInfo } from '../hooks/useHardhatNode';
import config from '../config';
import ContractDetailsModal from './ContractDetailsModal';

interface EthersTransactionResponse {
  hash: string;
  to: string | null;
  from: string;
  value: ethers.BigNumber;
  blockNumber: number | null;
  data: string;
  nonce: number;
  gasLimit: ethers.BigNumber;
  gasPrice: ethers.BigNumber;
  confirmations: number;
  chainId: number;
  r?: string;
  s?: string;
  v?: number;
  creates?: string | null;
  wait: (confirmations?: number) => Promise<ethers.providers.TransactionReceipt>;
}

interface Transaction {
  hash: string;
  to: string | null;
  from: string;
  value: string;
  timestamp: number;
  blockNumber: number;
}

const TransactionModal = ({ address, onClose }: { address: string; onClose: () => void }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
        const blockNumber = await provider.getBlockNumber();
        
        // Get the last 100 blocks to avoid too many requests
        const fromBlock = Math.max(0, blockNumber - 100);
        
        // Get all transaction hashes from the latest blocks
        const blocks = await Promise.all(
          Array.from({ length: blockNumber - fromBlock + 1 }, (_, i) => 
            provider.getBlockWithTransactions(fromBlock + i)
          )
        );
        
        // Filter transactions related to this address
        const allTxs = blocks.flatMap(block => 
          (block.transactions || []).filter(tx => 
            tx.from.toLowerCase() === address.toLowerCase() || 
            (tx.to && tx.to.toLowerCase() === address.toLowerCase())
          )
        ) as unknown as EthersTransactionResponse[];
        
        // Format transactions with block data
        const formattedTxs = await Promise.all(
          allTxs.map(async (tx) => {
            const block = await provider.getBlock(tx.blockNumber || 0);
            return {
              hash: tx.hash,
              to: tx.to,
              from: tx.from,
              value: ethers.utils.formatEther(tx.value || 0),
              timestamp: block?.timestamp || 0,
              blockNumber: tx.blockNumber || 0,
            };
          })
        );
        
        // Sort by block number (newest first)
        formattedTxs.sort((a, b) => b.blockNumber - a.blockNumber);
        
        setTransactions(formattedTxs);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transactions. Make sure your Hardhat node is running.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [address]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Transaction History</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-8">{error}</div>
          ) : transactions.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No transactions found</div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.hash} className="p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="font-mono text-sm text-gray-700">
                        <span className="font-medium">Hash:</span> {tx.hash.substring(0, 10)}...{tx.hash.substring(tx.hash.length - 8)}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">From:</span> {tx.from.substring(0, 8)}...{tx.from.substring(tx.from.length - 6)}
                      </div>
                      {tx.to && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">To:</span> {tx.to.substring(0, 8)}...{tx.to.substring(tx.to.length - 6)}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-blue-600">{tx.value} ETH</div>
                      <div className="text-xs text-gray-500">Block: {tx.blockNumber}</div>
                      <div className="text-xs text-gray-500">{formatDate(tx.timestamp)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

type TabType = 'signer' | 'accounts' | 'contracts';

interface NodeInfoProps {
  accounts: string[];
  contracts: Array<{
    name: string;
    address: string;
  }>;
  chainId: number;
  blockNumber: number;
}

const CopyButton = ({ text, label }: { text: string; label: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
      title={`Copy ${label}`}
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
      )}
    </button>
  );
};

// Hardhat's default private keys for the first 20 accounts
const HARDHAT_KEYS = Array.from({ length: 20 }, (_, i) => 
  ethers.utils.hexlify(
    ethers.BigNumber.from('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80').add(i)
  )
);

const NodeInfo = ({ accounts, contracts, chainId, blockNumber }: NodeInfoProps) => {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleViewTransactions = (address: string) => {
    setSelectedAccount(address);
    setShowModal(true);
  };
  const [activeTab, setActiveTab] = useState<TabType>('signer');
  const [accountDetails, setAccountDetails] = useState<AccountInfo[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);

  // Initialize account details with private keys and fetch balances
  useEffect(() => {
    const fetchAccountDetails = async () => {
      try {
        const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
        const details = await Promise.all(
          accounts.map(async (address, index) => {
            const balance = await provider.getBalance(address);
            const balanceInEth = ethers.utils.formatEther(balance);
            return {
              address,
              privateKey: HARDHAT_KEYS[index] || 'N/A',
              balance: parseFloat(balanceInEth).toFixed(4)
            };
          })
        );
        setAccountDetails(details);
      } catch (error) {
        console.error('Error fetching account details:', error);
      } finally {
        setIsLoadingBalances(false);
      }
    };

    fetchAccountDetails();
  }, [accounts]);

  const signer = accounts[0];
  const otherAccounts = accounts.slice(1);
  const signerDetails = accountDetails[0];

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  const renderAccountDetail = (label: string, value: string, isPrivate = false) => (
    <div className="mb-3">
      <div className="flex items-center text-sm text-gray-500 mb-1">
        {label}
      </div>
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
        <code className="font-mono text-sm break-all pr-2">
          {isPrivate ? '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••' : value}
        </code>
        <CopyButton text={value} label={label.toLowerCase()} />
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (isLoadingBalances) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'signer':
        if (!signerDetails) return null;
        return (
          <div className="p-4">
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h4 className="font-medium">Signer Account</h4>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewTransactions(signerDetails.address)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="View transactions"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
                    Signer
                  </span>
                </div>
              </div>
              {renderAccountDetail('Address', signerDetails.address)}
              {renderAccountDetail('Private Key', signerDetails.privateKey, true)}
              {renderAccountDetail('Balance', `${signerDetails.balance} ETH`)}
            </div>
          </div>
        );
      case 'accounts':
        return (
          <div className="space-y-4">
            {otherAccounts.length > 0 ? (
              otherAccounts.map((account, index) => {
                const detail = accountDetails[index + 1];
                if (!detail) return null;
                
                return (
                  <div key={account} className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b">
                      <h4 className="font-medium">Account {index + 1}</h4>
                      <button 
                        onClick={() => handleViewTransactions(detail.address)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="View transactions"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                    {renderAccountDetail('Address', detail.address)}
                    {renderAccountDetail('Private Key', detail.privateKey, true)}
                    {renderAccountDetail('Balance', `${detail.balance} ETH`)}
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-center py-8">No additional accounts found</p>
            )}
          </div>
        );
      case 'contracts':
        return (
          <div className="space-y-3">
            {contracts.length > 0 ? (
              contracts.map((contract, index) => (
                <div 
                  key={index} 
                  className="bg-white rounded-lg shadow-sm p-4 mb-2 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedContract(contract.address)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {contract.name}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <code className="font-mono text-sm text-gray-600 break-all pr-2">
                      {formatAddress(contract.address)}
                    </code>
                    <CopyButton text={contract.address} label="contract address" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No contracts deployed</p>
            )}
            {selectedContract && (
              <ContractDetailsModal 
                contractAddress={selectedContract} 
                onClose={() => setSelectedContract(null)} 
              />
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
        activeTab === tab
          ? 'bg-white text-blue-600 border-t-2 border-blue-600'
          : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );

  const rpcUrl = config.rpcUrl;
  const formattedChainId = `0x${chainId.toString(16)}`;

  return (
    <>
      {showModal && selectedAccount && (
        <TransactionModal 
          address={selectedAccount}
          onClose={() => setShowModal(false)}
        />
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-3">Network Information</h2>
          
          {/* RPC URL */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">RPC URL</span>
              <CopyButton text={rpcUrl} label="RPC URL" />
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
              <code className="text-sm font-mono break-all pr-2">{rpcUrl}</code>
            </div>
          </div>
          
          {/* Chain ID */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Chain ID (MetaMask: {formattedChainId})</span>
              <CopyButton text={formattedChainId} label="Chain ID" />
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
              <code className="text-sm font-mono">{chainId}</code>
              <button
                onClick={() => {
                  const networkData = {
                    chainId: formattedChainId,
                    chainName: config.chainName,
                    nativeCurrency: {
                      name: 'Ether',
                      symbol: config.currencySymbol,
                      decimals: 18,
                    },
                    rpcUrls: [rpcUrl],
                  };
                  
                  // @ts-ignore - ethereum is injected by MetaMask
                  window.ethereum?.request({
                    method: 'wallet_addEthereumChain',
                    params: [networkData],
                  }).catch(console.error);
                }}
                className="ml-2 px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                title="Add to MetaMask"
              >
                Add to MetaMask
              </button>
            </div>
          </div>
          
          {/* Block Number */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Current Block</span>
            <span className="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
              {blockNumber}
            </span>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex -mb-px bg-gray-50">
            <TabButton tab="signer" label="Signer" />
            <TabButton tab="accounts" label={`Accounts (${otherAccounts.length})`} />
            <TabButton tab="contracts" label={`Contracts (${contracts.length})`} />
          </div>
        </div>

        <div className="p-4">
          {renderTabContent()}
        </div>
      </div>
    </>
  );
};

export default NodeInfo;
