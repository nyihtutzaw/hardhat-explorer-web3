# Hardhat Explorer

A user-friendly web interface for interacting with your Hardhat development node. This tool provides a clean UI to view accounts, balances, private keys, and transaction history, making it easier to work with your local Hardhat environment.

![Hardhat Explorer Screenshot](screenshot.png)

## Features

- View all accounts with their addresses and private keys
- Check account balances in ETH
- Copy account addresses and private keys to clipboard
- View transaction history for each account
- Add network to MetaMask with one click
- Switch between different network configurations
- View deployed contracts

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Hardhat node running locally (or any Ethereum node)
- Modern web browser with MetaMask (optional)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/hardhat-explorer.git
cd hardhat-explorer
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure environment variables

Copy the example environment file and update the values if needed:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
REACT_APP_RPC_URL=http://127.0.0.1:8545
REACT_APP_CHAIN_ID=31337
REACT_APP_CHAIN_NAME="Hardhat Local"
REACT_APP_CURRENCY_SYMBOL=ETH
```

### 4. Start the development server

```bash
npm start
# or
yarn start
```

This will start the development server at [http://localhost:3000](http://localhost:3000).

### 5. Start your Hardhat node

In a separate terminal, start your Hardhat node:

```bash
npx hardhat node
```

## Usage

### Viewing Accounts

1. The "Signer" tab shows the first account (usually the deployer)
2. The "Accounts" tab lists all other accounts
3. Each account shows:
   - Address (with copy button)
   - Private key (hidden by default, with copy button)
   - Balance in ETH
   - Transaction history button (ℹ️)

### Adding to MetaMask

1. Click the "Add to MetaMask" button in the Network Information section
2. Confirm the network addition in the MetaMask popup
3. Switch to the newly added network in MetaMask

### Viewing Transaction History

1. Click the info (ℹ️) icon next to any account
2. A modal will show all transactions for that account
3. View transaction details including:
   - Transaction hash
   - From/To addresses
   - Value in ETH
   - Block number
   - Timestamp

## Configuration

You can customize the following environment variables in your `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_RPC_URL` | URL of your Hardhat node | `http://127.0.0.1:8545` |
| `REACT_APP_CHAIN_ID` | Chain ID of your network | `31337` (Hardhat default) |
| `REACT_APP_CHAIN_NAME` | Display name for your network | `"Hardhat Local"` |
| `REACT_APP_CURRENCY_SYMBOL` | Native currency symbol | `ETH` |

## Building for Production

To create a production build:

```bash
npm run build
# or
yarn build
```

This will create an optimized build in the `build` directory.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Built with [Create React App](https://create-react-app.dev/)
- [Ethers.js](https://docs.ethers.io/) for Ethereum interactions
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Hardhat](https://hardhat.org/) for local Ethereum development
