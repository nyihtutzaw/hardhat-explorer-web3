interface Config {
  rpcUrl: string;
  chainId: number;
  chainName: string;
  currencySymbol: string;
}

const config: Config = {
  rpcUrl: process.env.REACT_APP_RPC_URL || 'http://127.0.0.1:8545',
  chainId: parseInt(process.env.REACT_APP_CHAIN_ID || '31337', 10),
  chainName: process.env.REACT_APP_CHAIN_NAME || 'Hardhat Local',
  currencySymbol: process.env.REACT_APP_CURRENCY_SYMBOL || 'ETH',
};

export default config;
