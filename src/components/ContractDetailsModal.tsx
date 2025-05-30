import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import config from '../config';

interface ContractDetailsModalProps {
  contractAddress: string;
  onClose: () => void;
}

interface ContractStructField {
  name: string;
  type: string;
}

interface ContractStruct {
  name: string;
  fields: ContractStructField[];
}

interface ContractMapping {
  name: string;
  keyType: string;
  valueType: string;
}

interface ContractVariable {
  name: string;
  value: any;
  type: string;
  constant?: boolean;
}

interface ContractFunction {
  name: string;
  inputs: Array<{ name: string; type: string }>;
  outputs: Array<{ name: string; type: string }>;
  stateMutability: string;
}

const ContractDetailsModal = ({ contractAddress, onClose }: ContractDetailsModalProps) => {
  const [variables, setVariables] = useState<ContractVariable[]>([]);
  const [structs, setStructs] = useState<{[key: string]: ContractStruct}>({});
  const [mappings, setMappings] = useState<ContractMapping[]>([]);
  const [functions, setFunctions] = useState<ContractFunction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  
  // Memoized helper function to format value based on type
  const formatValue = React.useCallback((value: any, type: string): string => {
    if (value === undefined || value === null) return 'null';
    
    // Handle BigNumber
    if (ethers.BigNumber.isBigNumber(value)) {
      // If it's a uint/int, try to format it nicely
      if (type.startsWith('uint') || type.startsWith('int')) {
        try {
          return ethers.utils.formatEther(value) + ' ETH';
        } catch (e) {
          return value.toString();
        }
      }
      return value.toString();
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      return `[${value.map(v => formatValue(v, '')).join(', ')}]`;
    }
    
    // Handle objects
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch (e) {
        return String(value);
      }
    }
    
    return String(value);
  }, []); // No dependencies needed as we don't use any external values

  useEffect(() => {
    const fetchContractDetails = async () => {
      console.log('Fetching contract details for address:', contractAddress);
      setIsLoading(true);
      setError(null);
      
      try {
        // Validate contract address format
        if (!ethers.utils.isAddress(contractAddress)) {
          throw new Error('Invalid contract address format');
        }
        
        const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
        
        // Check if the contract is actually deployed
        console.log('Checking if contract is deployed...');
        const code = await provider.getCode(contractAddress);
        console.log('Contract code length:', code.length);
        if (code === '0x') {
          throw new Error('No contract code at this address');
        }
        
        // Get the contract balance
        const balance = await provider.getBalance(contractAddress);
        
        // Add balance to state variables
        const stateVars: ContractVariable[] = [
          {
            name: 'balance',
            value: ethers.utils.formatEther(balance) + ' ETH',
            type: 'uint256',
            constant: false
          }
        ];
        const genericABI = [
          // Common view functions for various contract types
          // ERC20 Token functions
          'function name() view returns (string)',
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)',
          'function totalSupply() view returns (uint256)',
          'function balanceOf(address) view returns (uint256)',
          'function allowance(address,address) view returns (uint256)',
          
          // ERC721 NFT functions
          'function ownerOf(uint256) view returns (address)',
          'function tokenURI(uint256) view returns (string)',
          'function balanceOf(address) view returns (uint256)',
          'function getApproved(uint256) view returns (address)',
          'function isApprovedForAll(address,address) view returns (bool)',
          
          // Ownership functions
          'function owner() view returns (address)',
          'function getOwner() view returns (address)',
          'function isOwner() view returns (bool)',
          
          // Governance functions
          'function getVotes(address) view returns (uint256)',
          'function delegates(address) view returns (address)',
          'function proposalCount() view returns (uint256)',
          'function getProposal(uint256) view returns (uint256,address,string,uint256)',
          
          // Staking/Yield functions
          'function rewardRate() view returns (uint256)',
          'function totalStaked() view returns (uint256)',
          'function earned(address) view returns (uint256)',
          'function getReward() view returns (uint256)',
          
          // Exchange/DEX functions
          'function getReserves() view returns (uint112,uint112,uint32)',
          'function token0() view returns (address)',
          'function token1() view returns (address)',
          'function getAmountOut(uint256,address,address) view returns (uint256)',
          
          // Donation/Crowdfunding functions
          'function minDonation() view returns (uint256)',
          'function maxDonation() view returns (uint256)',
          'function getDonationsCount() view returns (uint256)',
          'function getDonation(uint256) view returns (address,uint256,uint256)',
          
          // Generic data storage functions
          'function getData(uint256) view returns (bytes)',
          'function getCount() view returns (uint256)',
          'function getRecord(uint256) view returns (address,uint256,uint256,string)',
          'function getItem(uint256) view returns (string,uint256,bool)',
          'function getValue(string) view returns (string)',
          'function getAddressValue(string) view returns (address)',
          'function getUintValue(string) view returns (uint256)',
          'function getBoolValue(string) view returns (bool)'
        ];
        
        const contract = new ethers.Contract(contractAddress, genericABI, provider);
        
        // Add contract address to state variables
        stateVars.push({
          name: 'address',
          value: contractAddress,
          type: 'address',
          constant: true
        });
        
        // Try to call each view function to discover state variables
        const discoveredFunctions: ContractFunction[] = [];
        
        // Try each function with a timeout to prevent hanging
        const tryFunction = async (name: string, type: string) => {
          try {
            // Set a timeout of 1 second for each function call
            const result = await Promise.race([
              contract[name]().then((res: any) => ({ success: true, result: res })),
              new Promise<any>(resolve => setTimeout(() => resolve({ success: false }), 1000))
            ]);
            
            if (result.success && result.result !== undefined) {
              // Add to state variables
              stateVars.push({
                name,
                value: formatValue(result.result, type),
                type,
                constant: false
              });
              
              // Add to discovered functions
              discoveredFunctions.push({
                name,
                inputs: [],
                outputs: [{ name: '', type }],
                stateMutability: 'view'
              });
              
              return true;
            }
          } catch (e) {
            // Function doesn't exist or failed to call - ignore silently
          }
          return false;
        };
        
        // Try common ERC20 functions
        await tryFunction('name', 'string');
        await tryFunction('symbol', 'string');
        await tryFunction('decimals', 'uint8');
        await tryFunction('totalSupply', 'uint256');
        await tryFunction('owner', 'address');
        
        // Determine contract type based on discovered functions
        let contractType = 'Unknown Contract';
        if (discoveredFunctions.some(f => f.name === 'name') && 
            discoveredFunctions.some(f => f.name === 'symbol') && 
            discoveredFunctions.some(f => f.name === 'decimals')) {
          contractType = 'ERC20 Token';
        } else if (discoveredFunctions.some(f => f.name === 'owner')) {
          contractType = 'Ownable Contract';
        }
        
        // Add contract type to state variables
        stateVars.push({
          name: 'contractType',
          value: contractType,
          type: 'string',
          constant: true
        });
        
        // Try to detect if this is a donation contract
        try {
          const hasDonationFunction = await Promise.race([
            contract.getDonationsCount().then(() => true).catch(() => false),
            new Promise<boolean>(resolve => setTimeout(() => resolve(false), 500))
          ]);
          
          if (hasDonationFunction) {
            stateVars.push({
              name: 'contractType',
              value: 'Donation Contract',
              type: 'string',
              constant: true
            });
          }
        } catch (e) {
          // Ignore errors - this is expected
        }
        
        // Set the discovered data
        setVariables(stateVars);
        setFunctions(discoveredFunctions);
        setMappings([]);
        setStructs({});
        
        // Set loading to false
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching contract details:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load contract details: ${errorMessage}`);
        setIsLoading(false);
      }
    };
    
    if (contractAddress && contractAddress.trim() !== '') {
      console.log('Contract address is present, fetching details...');
      fetchContractDetails();
    } else {
      console.log('No contract address provided, skipping fetch');
      // If no contract address is provided, don't show loading state
      setIsLoading(false);
    }
    
    // No cleanup needed
    return () => {};
  }, [contractAddress]); // formatValue is now memoized and stable

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Loading contract details...</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium">Contract Details</h3>
            <p className="text-sm text-gray-500 break-all">{contractAddress}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Constants */}
          <div>
            <h4 className="font-medium mb-2 text-gray-700 border-b pb-1">Constants</h4>
            <div className="bg-gray-50 rounded p-3">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {variables.filter(v => v.constant).map((variable, index) => (
                    <tr key={`const-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-mono">{variable.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">{String(variable.value)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{variable.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* State Variables */}
          <div>
            <h4 className="font-medium mb-2 text-gray-700 border-b pb-1">State Variables</h4>
            <div className="bg-gray-50 rounded p-3">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {variables.filter(v => !v.constant).map((variable, index) => (
                    <tr key={`var-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-mono">{variable.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {variable.name === 'donations' ? (
                          <span>{variable.value} records</span>
                        ) : (
                          String(variable.value)
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{variable.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Structs */}
          {Object.values(structs).length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-gray-700 border-b pb-1">Structs</h4>
              <div className="space-y-3">
                {Object.values(structs).map((struct, index) => (
                  <div key={`struct-${index}`} className="bg-gray-50 rounded p-3">
                    <div className="font-mono text-sm">
                      <span className="text-purple-600">struct</span> {struct.name} {'{'}
                        {struct.fields.map((field, i) => (
                          <div key={i} className="ml-4">
                            {field.type} {field.name};
                          </div>
                        ))}
                      {'}'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mappings */}
          {mappings.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-gray-700 border-b pb-1">Mappings</h4>
              <div className="space-y-3">
                {mappings.map((mapping, index) => (
                  <div key={`mapping-${index}`} className="bg-gray-50 rounded p-3">
                    <div className="font-mono text-sm">
                      mapping({mapping.keyType} {'=>'} {mapping.valueType}) {mapping.name};
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Records/Items */}
          {records.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-gray-700 border-b pb-1">Records</h4>
              <div className="bg-gray-50 rounded p-3">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      {records[0].address && (
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                      )}
                      {records[0].amount && (
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      )}
                      {records[0].timestamp && (
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      )}
                      {records[0].value && (
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      )}
                      {records[0].description && (
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record, index) => (
                      <tr key={`record-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{record.id}</td>
                        {record.address && (
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-mono">
                            {record.address.substring(0, 8)}...{record.address.substring(record.address.length - 6)}
                          </td>
                        )}
                        {record.amount && (
                          <td className="px-4 py-2 whitespace-nowrap text-sm">{record.amount}</td>
                        )}
                        {record.timestamp && (
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{record.timestamp}</td>
                        )}
                        {record.value && (
                          <td className="px-4 py-2 whitespace-nowrap text-sm">{record.value}</td>
                        )}
                        {record.description && (
                          <td className="px-4 py-2 whitespace-nowrap text-sm">{record.description}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div>
          <h4 className="font-medium mb-2 text-gray-700 border-b pb-1">Functions</h4>
          {functions.length > 0 ? (
            <div className="space-y-3">
              {functions.map((func, index) => (
                <div key={index} className="bg-gray-50 rounded p-3">
                  <div className="font-mono text-sm">
                    <span className="text-blue-600">{func.name}</span>
                    ({func.inputs.map((input, i) => (
                      <span key={i}>
                        {i > 0 && ', '}
                        <span className="text-purple-600">{input.type}</span>
                        {input.name && ` ${input.name}`}
                      </span>
                    ))})
                    {func.stateMutability !== 'nonpayable' && (
                      <span className="text-gray-500 ml-1">{func.stateMutability}</span>
                    )}
                    {func.outputs.length > 0 && (
                      <span>
                        {' '}returns (
                        {func.outputs.map((output, i) => (
                          <span key={i}>
                            {i > 0 && ', '}
                            <span className="text-green-600">{output.type}</span>
                            {output.name && ` ${output.name}`}
                          </span>
                        ))}
                        )
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No functions found in ABI.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractDetailsModal;
