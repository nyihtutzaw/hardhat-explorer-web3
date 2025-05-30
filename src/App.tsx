import React from 'react';
import useHardhatNode, { AccountInfo } from './hooks/useHardhatNode';
import NodeInfo from './components/NodeInfo';

function App() {
  const { accounts, contracts, chainId, blockNumber, isLoading, error } = useHardhatNode();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-10 px-4">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <>
            <div className="p-4 mb-4 bg-red-50 border-l-4 border-red-500 text-red-700">
              <p className="font-bold">Error:</p>
              <p>{error}</p>
            </div>
            <div className="p-5 shadow-md border border-gray-200 rounded-md bg-white">
              <h2 className="text-lg font-semibold mb-4">Troubleshooting</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Make sure your Hardhat node is running with <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">npx hardhat node</code></li>
                <li>Check that the RPC URL is correct (http://127.0.0.1:8545)</li>
                <li>Ensure your Hardhat network is properly configured in hardhat.config.js</li>
              </ol>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-center mb-6">
              Hardhat Node Explorer
            </h1>
            <NodeInfo 
              accounts={accounts.map(acc => acc.address)} 
              contracts={contracts} 
              chainId={chainId} 
              blockNumber={blockNumber} 
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
