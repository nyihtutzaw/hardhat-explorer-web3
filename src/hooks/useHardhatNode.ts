import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import config from '../config';

interface ContractInfo {
  name: string;
  address: string;
}

export interface AccountInfo {
  address: string;
  privateKey: string;
  balance: string;
}

const useHardhatNode = () => {
  const [provider, setProvider] = useState<ethers.providers.JsonRpcProvider | null>(null);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [contracts, setContracts] = useState<ContractInfo[]>([]);
  const [chainId, setChainId] = useState<number>(-1);
  const [blockNumber, setBlockNumber] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const connectToNode = async () => {
      try {
        // Initialize provider with configured URL
        const nodeProvider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
        setProvider(nodeProvider);

        // Use configured chain ID or fallback to network
        const network = await nodeProvider.getNetwork();
        const effectiveChainId = config.chainId || network.chainId;
        setChainId(effectiveChainId);

        // Get block number
        const block = await nodeProvider.getBlockNumber();
        setBlockNumber(block);

        // Get accounts with private keys and balances
        const accounts = await nodeProvider.listAccounts();
        const accountsWithDetails = await Promise.all(accounts.map(async (address, index) => {
          // In Hardhat, the first 20 accounts have deterministic private keys
          // Private key for account N is: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 + N
          const privateKey = ethers.utils.hexlify(
            ethers.BigNumber.from('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')
              .add(index)
          );
          
          const balance = await nodeProvider.getBalance(address);
          const balanceInEth = ethers.utils.formatEther(balance);
          
          return {
            address,
            privateKey,
            balance: parseFloat(balanceInEth).toFixed(4)
          };
        }));
        
        setAccounts(accountsWithDetails);

        // Try to get deployed contracts (this is a simple approach, might need adjustment)
        // Check all accounts for contracts
        const contractChecks = accounts.map(async (account) => {
          const code = await nodeProvider.getCode(account);
          if (code !== '0x') {
            return { name: `Contract at ${account.substring(0, 8)}...`, address: account };
          }
          return null;
        });

        const foundContracts = (await Promise.all(contractChecks)).filter((contract): contract is ContractInfo => contract !== null);
        setContracts(foundContracts);
        
        // Add manual contract tracking - you can add your contract here
        const manualContracts = [
          {
            name: 'Donation Contract',
            address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
          }
        ];
        setContracts(prev => [...prev, ...manualContracts]);

        setIsLoading(false);
      } catch (err) {
        console.error('Error connecting to Hardhat node:', err);
        setError('Failed to connect to Hardhat node. Make sure it\'s running at http://127.0.0.1:8545');
        setIsLoading(false);
      }
    };

    connectToNode();
  }, []);

  return {
    provider,
    accounts,
    contracts,
    chainId,
    blockNumber,
    isLoading,
    error,
  };
};

export default useHardhatNode;
