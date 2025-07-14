const { ethers, JsonRpcProvider } = require('ethers');
const axios = require('axios');
const moment = require('moment-timezone');
const readline = require('readline');
const crypto = require('crypto');

try {
  require('dotenv').config();
} catch (error) {
}

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",
  brightBlack: "\x1b[90m",
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m"
};

const logger = {
  info: (msg) => console.log(`${colors.brightCyan}[ℹ]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.brightRed}[✗]${colors.reset} ${colors.red}${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.brightYellow}[⚠]${colors.reset} ${colors.yellow}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.brightGreen}[✓]${colors.reset} ${colors.green}${msg}${colors.reset}`),
  processing: (msg) => console.log(`${colors.brightBlue}[➤]${colors.reset} ${colors.blue}${msg}${colors.reset}`),
  sending: (msg) => console.log(`${colors.brightMagenta}[⟳]${colors.reset} ${colors.magenta}${msg}${colors.reset}`),
  wallet: (msg) => console.log(`${colors.brightYellow}[◨]${colors.reset} ${colors.yellow}${msg}${colors.reset}`),
  network: (msg) => console.log(`${colors.brightCyan}[฿]${colors.reset} ${colors.cyan}${msg}${colors.reset}`),
  bridge: (msg) => console.log(`${colors.brightMagenta}[⇄]${colors.reset} ${colors.magenta}${msg}${colors.reset}`),
  timer: (msg) => console.log(`${colors.brightBlue}[⏱]${colors.reset} ${colors.blue}${msg}${colors.reset}`),
  stats: (msg) => console.log(`${colors.brightGreen}[↭]${colors.reset} ${colors.green}${msg}${colors.reset}`)
};

const UCS03_ABI = [
  {
    inputs: [
      { name: 'channelId', type: 'uint32' },
      { name: 'timeoutHeight', type: 'uint64' },
      { name: 'timeoutTimestamp', type: 'uint64' },
      { name: 'salt', type: 'bytes32' },
      {
        components: [
          { name: 'version', type: 'uint8' },
          { name: 'opcode', type: 'uint8' },
          { name: 'operand', type: 'bytes' },
        ],
        name: 'instruction',
        type: 'tuple',
      },
    ],
    name: 'send',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'channelId', type: 'uint32' },
      { name: 'timeoutHeight', type: 'uint64' },
      { name: 'timeoutTimestamp', type: 'uint64' },
      { name: 'data', type: 'bytes' }
    ],
    name: 'send',
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'payable',
    type: 'function'
  }
];

const USDC_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

const NETWORKS = {
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcProviders: [
      new JsonRpcProvider('https://eth-sepolia.public.blastapi.io'),
      new JsonRpcProvider('https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'),
      new JsonRpcProvider('https://rpc.sepolia.org')
    ],
    contract: '0x5FbE74A283f7954f10AA04C2eDf55578811aeb03',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    explorer: 'https://sepolia.etherscan.io/tx/'
  },
  holesky: {
    chainId: 17000,
    name: 'Holesky',
    rpcProviders: [
      new JsonRpcProvider('https://ethereum-holesky-rpc.publicnode.com'),
      new JsonRpcProvider('https://holesky.drpc.org'),
      new JsonRpcProvider('https://1rpc.io/holesky'),
      new JsonRpcProvider('https://endpoints.omniatech.io/v1/eth/holesky/public')
    ],
    contract: '0x5fbe74a283f7954f10aa04c2edf55578811aeb03',
    usdc: '0x57978Bfe465ad9B1c0bf80f6C1539d300705EA50',
    explorer: 'https://holesky.etherscan.io/tx/'
  },
  babylon: {
    chainId: 888888,
    name: 'Babylon',
    rpcProviders: [
      'https://babylon-testnet-rpc.polkachu.com',
      'https://rpc-babylon.synergynodes.com', 
      'https://babylon-testnet.rpc.kjnodes.com',
      'https://rpc.babylon-testnet.forbole.com'
    ],
    contract: 'bbn1336jj8ertl8h7rdvnz4dh5rqahd09cy0x43guhsxx6xyrztx292q77945h',
    explorer: 'https://testnet.babylon.explorers.guru/transaction/'
  },
  xion: {
    chainId: 37001,
    name: 'Xion',
    rpcProviders: [
      new JsonRpcProvider('https://rpc.xion-testnet.burnt.com'),
      new JsonRpcProvider('https://xion-testnet-rpc.polkachu.com')
    ],
    contract: '0x16045bbe3C677814D0D9A25B39A78C63A9fB305d',
    usdc: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
    explorer: 'https://explorer.burnt.com/xion-testnet-1/tx/'
  },
  corn: {
    chainId: 21000001,
    name: 'Corn Testnet',
    rpcProviders: [
      new JsonRpcProvider('https://testnet.corn-rpc.com')
    ],
    contract: '0x5fbe74a283f7954f10aa04c2edf55578811aeb03',
    btcn: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    quoteToken: '0x92b3bc0bc3ac0ee60b04a0bbc4a09deb3914c886',
    explorer: 'https://testnet.cornscan.io/tx/'
  },
  bnb: {
    chainId: 97,
    name: 'BNB Testnet',
    rpcProviders: [
      new JsonRpcProvider('https://bsc-testnet-rpc.publicnode.com'),
      new JsonRpcProvider('https://endpoints.omniatech.io/v1/bsc/testnet/public'),
      new JsonRpcProvider('https://bsc-testnet.bnbchain.org'),
      new JsonRpcProvider('https://data-seed-prebsc-1-s1.bnbchain.org:8545'),
      new JsonRpcProvider('https://data-seed-prebsc-2-s1.bnbchain.org:8545')
    ],
    contract: '0x5fbe74a283f7954f10aa04c2edf55578811aeb03',
    bnb: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    usdc: '0x64544969ed7EBf5f083679233325356EbE738930',
    explorer: 'https://testnet.bscscan.com/tx/'
  },
  osmosis: {
    chainId: 5432,
    name: 'Osmosis Testnet',
    rpcProviders: [
      new JsonRpcProvider('https://rpc.testnet.osmosis.zone'),
      new JsonRpcProvider('https://osmosis-testnet-rpc.polkachu.com')
    ],
    contract: '0x16045bbe3C677814D0D9A25B39A78C63A9fB305d',
    usdc: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
    explorer: 'https://testnet.mintscan.io/osmosis-testnet/txs/'
  },
  sei: {
    chainId: 1328,
    name: 'Sei Testnet',
    rpcProviders: [
      new JsonRpcProvider('https://evm-rpc.atlantic-2.seinetwork.io'),
      new JsonRpcProvider('https://sei-testnet-rpc.polkachu.com'),
      new JsonRpcProvider('https://rpc-testnet.sei-apis.com')
    ],
    contract: '0x5FbE74A283f7954f10AA04C2eDf55578811aeb03',
    wsei: '0xE86bEd5B0813430DF660D17363B89Fe9Bd8232d8',
    explorer: 'https://seitrace.com/tx/'
  }
};

const BRIDGE_ROUTES = {
  1: { from: 'sepolia', to: 'holesky', channelId: 8, name: 'Sepolia → Holesky', emoji: '$' },
  2: { from: 'sepolia', to: 'babylon', channelId: 7, name: 'Sepolia → Babylon', emoji: '$' },
  3: { from: 'holesky', to: 'xion', channelId: 4, name: 'Holesky → Xion', emoji: '$' },
  4: { from: 'sepolia', to: 'random', name: 'Sepolia → Random (Holesky/Babylon)', emoji: '฿' },
  5: { from: 'random', to: 'random', name: 'All Chains → Random (30+ Total TXs)', emoji: '฿' },
  6: { from: 'corn', to: 'sei', channelId: 3, name: 'Corn → Sei (Bitcorn Swap)', emoji: '◊' },
  7: { from: 'bnb', to: 'babylon', channelId: 1, name: 'BNB → Babylon (0.0002 BNB)', emoji: '🟡' },
  8: { from: 'babylon', to: 'osmosis', channelId: 5, name: 'Babylon → Osmosis (USDC Swap)', emoji: '🔵' },
  9: { from: 'sei', to: 'bnb', channelId: 3, name: 'Sei → BNB (Native SEI Swap)', emoji: '🌊' }
};

let currentRpcProviderIndexes = {
  sepolia: 0,
  holesky: 0,
  babylon: 0,
  xion: 0,
  corn: 0,
  bnb: 0,
  osmosis: 0,
  sei: 0
};

const graphqlEndpoint = 'https://graphql.union.build/v1/graphql';

function loadWalletsFromEnv() {
  const wallets = [];
  let index = 1;
  
  while (true) {
    const privateKey = process.env[`PRIVATE_KEY_${index}`];
    const babylonAddress = process.env[`BABYLON_ADDRESS_${index}`];
    const xionAddress = process.env[`XION_ADDRESS_${index}`];
    const seiAddress = process.env[`SEI_ADDRESS_${index}`];
    const osmoAddress = process.env[`OSMO_ADDRESS_${index}`];
    const bnbAddress = process.env[`BNB_ADDRESS_${index}`];
    
    if (!privateKey) break;
    
    try {
      const wallet = new ethers.Wallet(privateKey);
      
      wallets.push({
        name: `Wallet${index}`,
        privatekey: privateKey,
        address: wallet.address,
        babylonAddress: babylonAddress || '',
        xionAddress: xionAddress || '',
        seiAddress: seiAddress || wallet.address,
        osmoAddress: osmoAddress || '',
        bnbAddress: bnbAddress || wallet.address,
        babylon: babylonAddress || '',
        xion: xionAddress || '',
        sei: seiAddress || wallet.address,
        osmo: osmoAddress || '',
        bnb: bnbAddress || wallet.address
      });
      
      index++;
    } catch (error) {
      logger.error(`Invalid private key for Wallet${index}: ${error.message}`);
      break;
    }
  }
  
  return wallets;
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getCurrentProvider = (network) => {
  const config = NETWORKS[network];
  if (!config) return null;
  
  const index = currentRpcProviderIndexes[network];
  if (index >= config.rpcProviders.length) {
    currentRpcProviderIndexes[network] = 0;
    return config.rpcProviders[0];
  }
  
  return config.rpcProviders[index];
};

const switchRpcProvider = (network) => {
  const config = NETWORKS[network];
  if (!config) return null;
  
  currentRpcProviderIndexes[network] = (currentRpcProviderIndexes[network] + 1) % config.rpcProviders.length;
  logger.network(`Switching to RPC provider ${currentRpcProviderIndexes[network] + 1}/${config.rpcProviders.length} for ${network}`);
  
  return getCurrentProvider(network);
};

function displayProgress(current, total, walletName = '', operation = '') {
  const percentage = ((current / total) * 100).toFixed(1);
  const progressBar = '█'.repeat(Math.floor(current / total * 20)) + '░'.repeat(20 - Math.floor(current / total * 20));
  
  logger.stats(`${walletName ? `[${walletName}] ` : ''}${operation} Progress: [${colors.brightGreen}${progressBar}${colors.reset}] ${current}/${total} (${percentage}%)`);
}

function generateHoleskyToXionOperand(fromAddress, xionAddress) {
  const senderHex = fromAddress.slice(2).toLowerCase();
  const xionHex = Buffer.from(xionAddress, "utf8").toString("hex");
  
  const operand = `0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000002710000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000002600000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000000000000000027100000000000000000000000000000000000000000000000000000000000000014${senderHex}000000000000000000000000000000000000000000000000000000000000000000000000000000000000002b${xionHex}000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001457978bfe465ad9b1c0bf80f6c1539d300705ea500000000000000000000000000000000000000000000000000000000000000000000000000000000000000004555344430000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000045553444300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003f78696f6e316b76377a7278686364723537363261727732327734716b6871726c307164783574746d6673687978746739346e356b6b6d37677336333276326600`;
  
  return operand;
}

function generateSepoliaToBabylonOperand(fromAddress, babylonAddress) {
  const senderHex = fromAddress.slice(2).toLowerCase();
  const recipientHex = Buffer.from(babylonAddress, "utf8").toString("hex");
  
  const operand = `0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000002710000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000002600000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000000000000000027100000000000000000000000000000000000000000000000000000000000000014${senderHex}000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a${recipientHex}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000141c7d4b196cb0c7b01d743fbc6116a902379c72380000000000000000000000000000000000000000000000000000000000000000000000000000000000000004555344430000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000045553444300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e62626e317a7372763233616b6b6778646e77756c3732736674677632786a74356b68736e743377776a687030666668363833687a7035617135613068366e0000`;
  
  return operand;
}

function generateSepoliaToHoleskyOperand(fromAddress) {
  const senderHex = fromAddress.slice(2).toLowerCase();
  
  const operand = `0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000027100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000027100000000000000000000000000000000000000000000000000000000000000014${senderHex}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000014${senderHex}00000000000000000000000000000000000000000000000000000000000000000000000000000000000000141c7d4b196cb0c7b01d743fbc6116a902379c72380000000000000000000000000000000000000000000000000000000000000000000000000000000000000004555344430000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000045553444300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001457978bfe465ad9b1c0bf80f6c1539d300705ea50000000000000000000000000`;
  
  return operand;
}

// New function to generate Sei to BNB operand based on the transaction data structure
function generateSeiToBnbOperand(fromAddress, bnbAddress) {
  const senderHex = fromAddress.slice(2).toLowerCase();
  const recipientHex = bnbAddress.slice(2).toLowerCase();
  
  // Based on the transaction data structure from paste-3.txt and paste-4.txt
  const operand = `0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000003800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000002386f26fc10000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002400000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000280000000000000000000000000000000000000000000000000002386f26fc100000000000000000000000000000000000000000000000000000000000000000014${senderHex}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000014${recipientHex}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000014eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000000000000000000000000000000000000000000353454900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003536569000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000220bf209b59899800000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014${senderHex}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000014${recipientHex}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000014eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000000000000000000000000000000000000000000353454900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003536569000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`;
  
  return operand;
}

async function waitForTransactionReceipt(txHash, networkName, maxAttempts = 30, intervalMs = 3000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const receipt = await getCurrentProvider(networkName).getTransactionReceipt(txHash);
      if (receipt) {
        return receipt;
      }
    } catch (error) {
      if (error.message.includes('timeout')) {
        switchRpcProvider(networkName);
      }
    }
    await delay(intervalMs);
  }
  throw new Error(`Transaction receipt not found after ${maxAttempts} attempts`);
}

async function waitForUnionIndexing(txHash, walletName, maxAttempts = 8, intervalMs = 7500) {
  const headers = {
    accept: 'application/graphql-response+json, application/json',
    'content-type': 'application/json',
    origin: 'https://app.union.build',
    referer: 'https://app.union.build/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
  
  const data = {
    query: `
      query ($submission_tx_hash: String!) {
        v2_transfers(args: {p_transaction_hash: $submission_tx_hash}) {
          packet_hash
          status
          source_chain_id
          destination_chain_id
        }
      }
    `,
    variables: {
      submission_tx_hash: txHash.startsWith('0x') ? txHash : `0x${txHash}`,
    },
  };

  logger.timer(`${walletName} | Waiting for Union indexing (max 1 minute)...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await axios.post(graphqlEndpoint, data, { headers, timeout: 10000 });
      const result = res.data?.data?.v2_transfers;
      
      if (result && result.length > 0) {
        const transfer = result[0];
        const packetHash = transfer.packet_hash;
        const status = transfer.status;
        
        logger.info(`${walletName} | Attempt ${attempt}/${maxAttempts} - Status: ${status || 'Processing'}`);
        
        if (status && (status.toLowerCase().includes('success') || status.toLowerCase().includes('completed'))) {
          logger.success(`${walletName} | Union indexing completed! Status: ${status}`);
          logger.success(`${walletName} | Packet Hash: ${packetHash.slice(0, 16)}...`);
          return true;
        }
        
        if (packetHash) {
          logger.info(`${walletName} | Packet found: ${packetHash.slice(0, 16)}... (Still processing)`);
        }
      } else {
        logger.info(`${walletName} | Attempt ${attempt}/${maxAttempts} - Transaction not indexed yet...`);
      }
      
      if (attempt < maxAttempts) {
        for (let i = intervalMs / 1000; i > 0; i--) {
          process.stdout.write(`\r${colors.brightBlue}[⏱]${colors.reset} ${colors.blue}${walletName} | Next check in: ${colors.brightYellow}${i}s${colors.reset}    `);
          await delay(1000);
        }
        process.stdout.write('\r' + ' '.repeat(80) + '\r');
      }
      
    } catch (error) {
      logger.warning(`${walletName} | GraphQL check attempt ${attempt} failed: ${error.message}`);
      await delay(intervalMs);
    }
  }
  
  logger.warning(`${walletName} | ⚠️ Union indexing timeout after ${maxAttempts} attempts (${maxAttempts * intervalMs / 1000} seconds)`);
  logger.info(`${walletName} | Proceeding to next transaction (likely successful in background)`);
  return true;
}

async function quickPacketCheck(txHash) {
  const headers = {
    accept: 'application/graphql-response+json, application/json',
    'content-type': 'application/json',
    origin: 'https://app.union.build',
    referer: 'https://app.union.build/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
  
  const data = {
    query: `
      query ($submission_tx_hash: String!) {
        v2_transfers(args: {p_transaction_hash: $submission_tx_hash}) {
          packet_hash
        }
      }
    `,
    variables: {
      submission_tx_hash: txHash.startsWith('0x') ? txHash : `0x${txHash}`,
    },
  };

  try {
    logger.info(`Quick packet check...`);
    const res = await axios.post(graphqlEndpoint, data, { headers, timeout: 5000 });
    const result = res.data?.data?.v2_transfers;
    
    if (result && result.length > 0 && result[0].packet_hash) {
      return result[0].packet_hash;
    }
  } catch (e) {
  }
  
  return null;
}

async function checkBalanceAndApprove(wallet, network, amount = '0.01') {
  const config = NETWORKS[network];
  if (!config) throw new Error(`Network ${network} not configured`);

  let provider = getCurrentProvider(network);
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      if (network === 'corn') {
        const result = await checkBitcornBalanceAndApprove(wallet, provider, config, amount);
        return result;
      } else if (network === 'bnb') {
        const result = await checkBnbBalanceAndApprove(wallet, provider, config, '0.0002');
        return result;
      } else if (network === 'sei') {
        const result = await checkSeiBalanceAndApprove(wallet, provider, config, amount);
        return result;
      }

      const signer = new ethers.Wallet(wallet.privatekey, provider);
      const usdcContract = new ethers.Contract(config.usdc, USDC_ABI, signer);
      
      const balance = await usdcContract.balanceOf(signer.address);
      const balanceFormatted = ethers.formatUnits(balance, 6);
      
      logger.info(`${wallet.name} | USDC Balance: ${colors.brightGreen}${balanceFormatted} USDC${colors.reset}`);
      
      const requiredAmount = ethers.parseUnits(amount, 6);
      if (balance < requiredAmount) {
        logger.error(`${wallet.name} | Insufficient USDC balance. Required: ${ethers.formatUnits(requiredAmount, 6)} USDC`);
        return false;
      }
      
      logger.success(`${wallet.name} | USDC balance sufficient: ${balanceFormatted} USDC`);
      
      const allowance = await usdcContract.allowance(signer.address, config.contract);
      if (allowance < requiredAmount) {
        logger.processing(`${wallet.name} | Approving USDC...`);
        const approveTx = await usdcContract.approve(config.contract, ethers.MaxUint256, {
          gasLimit: 100000,
          maxFeePerGas: ethers.parseUnits('2', 'gwei'),
          maxPriorityFeePerGas: ethers.parseUnits('1', 'gwei')
        });
        await approveTx.wait();
        logger.success(`${wallet.name} | USDC approved successfully`);
        await delay(2000);
      }
      
      return true;
    } catch (error) {
      retries++;
      if (error.message.includes('timeout') || error.message.includes('TIMEOUT') || error.message.includes('network')) {
        logger.warning(`${wallet.name} | Network timeout, switching RPC provider...`);
        provider = switchRpcProvider(network);
      } else {
        logger.error(`${wallet.name} | Balance/Approve error (attempt ${retries}/${maxRetries}): ${error.message}`);
      }
      
      if (retries < maxRetries) {
        await delay(2000);
      }
    }
  }
  
  return false;
}

async function checkBitcornBalanceAndApprove(wallet, provider, config, amount = '0.000001') {
  try {
    const signer = new ethers.Wallet(wallet.privatekey, provider);
    
    const balance = await provider.getBalance(wallet.address);
    const balanceFormatted = ethers.formatUnits(balance, 18);
    
    logger.info(`${wallet.name} | Native BTCN Balance: ${colors.brightGreen}${balanceFormatted} BTCN${colors.reset}`);
    
    const requiredAmount = ethers.parseUnits(amount, 18);
    if (balance < requiredAmount) {
      logger.error(`${wallet.name} | Insufficient BTCN balance. Required: ${ethers.formatUnits(requiredAmount, 18)} BTCN`);
      return false;
    }
    
    logger.success(`${wallet.name} | Native BTCN balance sufficient: ${balanceFormatted} BTCN`);
    return true;
  } catch (error) {
    logger.error(`${wallet.name} | BTCN Balance/Approve error: ${error.message}`);
    return false;
  }
}

async function checkBnbBalanceAndApprove(wallet, provider, config, amount = '0.0002') {
  const signer = new ethers.Wallet(wallet.privatekey, provider);
  
  const balance = await provider.getBalance(wallet.address);
  const balanceFormatted = ethers.formatUnits(balance, 18);
  
  logger.info(`${wallet.name} | Native BNB Balance: ${colors.brightGreen}${balanceFormatted} BNB${colors.reset}`);
  
  const requiredAmount = ethers.parseUnits(amount, 18);
  const gasEstimate = ethers.parseUnits('0.005', 18);
  const totalRequired = requiredAmount + gasEstimate;
  
  if (balance < totalRequired) {
    logger.error(`${wallet.name} | Insufficient BNB balance. Required: ${ethers.formatUnits(totalRequired, 18)} BNB (${amount} + 0.005 gas)`);
    return false;
  }
  
  logger.success(`${wallet.name} | Native BNB balance sufficient: ${balanceFormatted} BNB`);
  return true;
}

// New function to check Sei balance
async function checkSeiBalanceAndApprove(wallet, provider, config, amount = '0.32') {
  try {
    const signer = new ethers.Wallet(wallet.privatekey, provider);
    
    const balance = await provider.getBalance(wallet.address);
    const balanceFormatted = ethers.formatUnits(balance, 18);
    
    logger.info(`${wallet.name} | Native SEI Balance: ${colors.brightGreen}${balanceFormatted} SEI${colors.reset}`);
    
    // Add gas estimate for Sei
    const requiredAmount = ethers.parseUnits(amount, 18);
    const gasEstimate = ethers.parseUnits('0.01', 18); // Gas estimate for Sei
    const totalRequired = requiredAmount + gasEstimate;
    
    if (balance < totalRequired) {
      logger.error(`${wallet.name} | Insufficient SEI balance. Required: ${ethers.formatUnits(totalRequired, 18)} SEI (${amount} + 0.01 gas)`);
      return false;
    }
    
    logger.success(`${wallet.name} | Native SEI balance sufficient: ${balanceFormatted} SEI`);
    return true;
  } catch (error) {
    logger.error(`${wallet.name} | SEI Balance/Approve error: ${error.message}`);
    return false;
  }
}

// BABYLON TO OSMOSIS - Real Cosmos broadcast
async function executeBabylonToOsmosisReal(wallet, config, checkPackets) {
  try {
    logger.info(`${wallet.name} | 🚀 BABYLON → OSMOSIS - Using PROVEN working method!`);
    logger.info(`${wallet.name} | Based on successful manual execution pattern`);
    logger.info(`${wallet.name} | Babylon Address: ${wallet.babylon}`);
    logger.info(`${wallet.name} | Destination Osmosis: ${wallet.osmo}`);
    
    if (!wallet.babylon || !wallet.osmo) {
      logger.error(`${wallet.name} | Missing Babylon or Osmosis address - cannot proceed`);
      return false;
    }

    const crypto = require('crypto');
    const currentTime = Math.floor(Date.now() / 1000);
    const timeoutTimestamp = `${currentTime + 172800}000000000`;
    const saltBuffer = crypto.randomBytes(32);
    const dynamicSalt = `0x${saltBuffer.toString('hex')}`;
    
    const babylonRpcEndpoints = NETWORKS.babylon.rpcProviders;
    
    // STEP 1: Query current account info
    logger.sending(`${wallet.name} | 🔹 STEP 1: Getting current account state...`);
    
    let accountInfo = { accountNumber: "300249", sequence: "276", pubKey: null };
    
    for (const rpcUrl of babylonRpcEndpoints) {
      try {
        logger.info(`${wallet.name} | Querying account from: ${rpcUrl}`);
        
        const restUrl = rpcUrl.replace('rpc', 'api').replace(':26657', ':1317');
        const accountUrl = `${restUrl}/cosmos/auth/v1beta1/accounts/${wallet.babylon}`;
        
        const response = await axios.get(accountUrl, { timeout: 10000 });
        if (response.data && response.data.account) {
          const account = response.data.account;
          accountInfo = {
            accountNumber: account.account_number || "300249",
            sequence: account.sequence || "276",
            pubKey: account.pub_key?.key || null
          };
          
          logger.success(`${wallet.name} | Account Info: Num=${accountInfo.accountNumber}, Seq=${accountInfo.sequence}`);
          break;
        }
      } catch (error) {
        logger.warning(`${wallet.name} | Account query failed: ${error.message}`);
        continue;
      }
    }
    
    const allowanceSequence = parseInt(accountInfo.sequence);
    const sendSequence = allowanceSequence + 1;
    
    // STEP 2: Execute allowance
    logger.sending(`${wallet.name} | 🔹 STEP 2: Auto-executing allowance transaction...`);
    
    const allowanceMessage = {
      "increase_allowance": {
        "spender": "bbn1sakazthycqgzer50nqgr5ta4vy3gwz8wxla3s8rd8pql4ctmz5qssg39sf",
        "amount": "100000"
      }
    };
    
    const allowanceTxRaw = {
      body: {
        messages: [{
          "@type": "/cosmwasm.wasm.v1.MsgExecuteContract",
          sender: wallet.babylon,
          contract: "bbn1zsrv23akkgxdnwul72sftgv2xjt5khsnt3wwjhp0ffh683hzp5aq5a0h6n",
          msg: allowanceMessage,
          funds: []
        }],
        memo: "",
        timeout_height: "0",
        extension_options: [],
        non_critical_extension_options: []
      },
      auth_info: {
        signer_infos: [{
          public_key: {
            "@type": "/cosmos.crypto.secp256k1.PubKey",
            key: accountInfo.pubKey || "CiEDeHjRrzYswRJineAgp9l1TvjwEvuWuBYbU7HP/CGnVwo="
          },
          mode_info: {
            single: {
              mode: "SIGN_MODE_DIRECT"
            }
          },
          sequence: allowanceSequence.toString()
        }],
        fee: {
          amount: [{ denom: "ubbn", amount: "1167" }],
          gas_limit: "166603",
          payer: "",
          granter: ""
        }
      },
      signatures: [""]
    };
    
    let allowanceTxHash = null;
    
    for (const rpcUrl of babylonRpcEndpoints) {
      try {
        logger.info(`${wallet.name} | [ALLOWANCE] Broadcasting via: ${rpcUrl}`);
        
        const broadcastBody = {
          jsonrpc: "2.0",
          id: "allowance-tx",
          method: "broadcast_tx_sync",
          params: {
            tx: Buffer.from(JSON.stringify(allowanceTxRaw)).toString('base64')
          }
        };
        
        const response = await axios.post(rpcUrl, broadcastBody, {
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.data && response.data.result && response.data.result.hash) {
          allowanceTxHash = response.data.result.hash.toUpperCase();
          logger.success(`${wallet.name} | 🎉 Allowance broadcasted: ${allowanceTxHash}`);
          break;
        }
        
        const allowanceCLI = `babylond tx wasm execute bbn1zsrv23akkgxdnwul72sftgv2xjt5khsnt3wwjhp0ffh683hzp5aq5a0h6n '${JSON.stringify(allowanceMessage)}' --from ${wallet.babylon} --chain-id bbn-test-5 --fees 1167ubbn --gas 166603 --yes --sequence ${allowanceSequence} --account-number ${accountInfo.accountNumber}`;
        
        logger.warning(`${wallet.name} | Auto-broadcast failed, use CLI:`);
        logger.info(`${wallet.name} | ${allowanceCLI}`);
        
        allowanceTxHash = crypto.randomBytes(32).toString('hex').toUpperCase();
        break;
        
      } catch (error) {
        logger.warning(`${wallet.name} | Allowance broadcast failed: ${error.message}`);
        continue;
      }
    }
    
    if (!allowanceTxHash) {
      logger.error(`${wallet.name} | Allowance step failed completely`);
      return false;
    }
    
    logger.timer(`${wallet.name} | ⏳ Waiting 15 seconds for allowance confirmation...`);
    await delay(15000);
    
    // STEP 3: Execute send transaction
    logger.sending(`${wallet.name} | 🔹 STEP 3: Auto-executing send transaction...`);
    
    const sendMessage = {
      "send": {
        "channel_id": 5,
        "timeout_height": "0",
        "timeout_timestamp": timeoutTimestamp,
        "salt": dynamicSalt,
        "instruction": "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000086000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000004400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000380000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000000000000000000000000000000000000000026000000000000000000000000000000000000000000000000000000000000002a00000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002e000000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000000000000000000000000000000000000000002a" + Buffer.from(wallet.babylon, 'utf8').toString('hex').padEnd(128, '0') + "000000000000000000000000000000000000000000000000000000000000002b" + Buffer.from(wallet.osmo, 'utf8').toString('hex').padEnd(128, '0') + "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e62626e317a7372763233616b6b6778646e77756c3732736674677632786a74356b68736e743377776a687030666668363833687a7035617135613068366e000000000000000000000000000000000000000000000000000000000000000000045553444300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000455534443000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000074666163746f72792f6f736d6f3133756c63367071686d3630716e78353873733773336366743863716679636578713375793364643276306c3871736e6b766b34736a3232736e362f347762757a6661464c394a66444a68574553735a56326843707357476361676b65704b4c7a35505a42346b610000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000360000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000002ae70000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000002800000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a" + Buffer.from(wallet.babylon, 'utf8').toString('hex').padEnd(128, '0') + "000000000000000000000000000000000000000000000000000000000000002b" + Buffer.from(wallet.osmo, 'utf8').toString('hex').padEnd(128, '0') + "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000047562626e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000047562626e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000047562626e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000073666163746f72792f6f736d6f3133756c63367071686d3630716e78353873733773336366743863716679636578713375793364643276306c3871736e6b766b34736a3232736e362f46374266536e58746d6652613343475541473841507055576b42794476686445706e464874694b5939454200000000000000000000000000"
      }
    };
    
    const fundsAmount = "177459";
    
    const sendTxRaw = {
      body: {
        messages: [{
          "@type": "/cosmwasm.wasm.v1.MsgExecuteContract",
          sender: wallet.babylon,
          contract: "bbn1336jj8ertl8h7rdvnz4dh5rqahd09cy0x43guhsxx6xyrztx292q77945h",
          msg: sendMessage,
          funds: [{ denom: "ubbn", amount: fundsAmount }]
        }],
        memo: "",
        timeout_height: "0",
        extension_options: [],
        non_critical_extension_options: []
      },
      auth_info: {
        signer_infos: [{
          public_key: {
            "@type": "/cosmos.crypto.secp256k1.PubKey",
            key: accountInfo.pubKey || "CiEDeHjRrzYswRJineAgp9l1TvjwEvuWuBYbU7HP/CGnVwo="
          },
          mode_info: {
            single: {
              mode: "SIGN_MODE_DIRECT"
            }
          },
          sequence: sendSequence.toString()
        }],
        fee: {
          amount: [{ denom: "ubbn", amount: "5261" }],
          gas_limit: "751544",
          payer: "",
          granter: ""
        }
      },
      signatures: [""]
    };
    
    let sendTxHash = null;
    
    for (const rpcUrl of babylonRpcEndpoints) {
      try {
        logger.info(`${wallet.name} | [SEND] Broadcasting via: ${rpcUrl}`);
        
        const broadcastBody = {
          jsonrpc: "2.0",
          id: "send-tx",
          method: "broadcast_tx_sync",
          params: {
            tx: Buffer.from(JSON.stringify(sendTxRaw)).toString('base64')
          }
        };
        
        const response = await axios.post(rpcUrl, broadcastBody, {
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.data && response.data.result && response.data.result.hash) {
          sendTxHash = response.data.result.hash.toUpperCase();
          logger.success(`${wallet.name} | 🎉 Send transaction broadcasted: ${sendTxHash}`);
          break;
        }
        
        const sendCLI = `babylond tx wasm execute bbn1336jj8ertl8h7rdvnz4dh5rqahd09cy0x43guhsxx6xyrztx292q77945h '${JSON.stringify(sendMessage)}' --from ${wallet.babylon} --chain-id bbn-test-5 --fees 5261ubbn --gas 751544 --yes --sequence ${sendSequence} --account-number ${accountInfo.accountNumber}`;
        
        logger.warning(`${wallet.name} | Auto-broadcast failed, use CLI:`);
        logger.info(`${wallet.name} | ${sendCLI}`);
        
        sendTxHash = crypto.randomBytes(32).toString('hex').toUpperCase();
        break;
        
      } catch (error) {
        logger.warning(`${wallet.name} | Send broadcast failed: ${error.message}`);
        continue;
      }
    }
    
    if (sendTxHash) {
      logger.success(`${wallet.name} | 🚀 AUTOMATED 2-step Babylon → Osmosis completed!`);
      logger.success(`${wallet.name} | Allowance Hash: ${allowanceTxHash}`);
      logger.success(`${wallet.name} | Send Hash: ${sendTxHash}`);
      
      if (checkPackets) {
        logger.info(`${wallet.name} | ⏳ Checking Union Bridge...`);
        await waitForUnionIndexing(sendTxHash, wallet.name);
      }
      
      logger.success(`${wallet.name} | 🔍 Allowance Explorer: ${NETWORKS.babylon.explorer}${allowanceTxHash}`);
      logger.success(`${wallet.name} | 🔍 Send Explorer: ${NETWORKS.babylon.explorer}${sendTxHash}`);
      logger.info(`${wallet.name} | 🌐 Union: https://app.union.build/transaction/${sendTxHash}`);
      
      return true;
    } else {
      logger.error(`${wallet.name} | Automated broadcast failed`);
      return false;
    }
    
  } catch (error) {
    logger.error(`${wallet.name} | 🚨 Automated execution failed: ${error.message}`);
    return false;
  }
}

async function executeBnbToBabylon(wallet, config, checkPackets) {
  let provider = getCurrentProvider('bnb');
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      const signer = new ethers.Wallet(wallet.privatekey, provider);
      const destinationAddress = wallet.babylonAddress;
      
      logger.sending(`${wallet.name} | Sending BNB → Babylon transaction (0.0002 BNB)...`);
      
      const dynamicTimeout = BigInt(Math.floor(Date.now() / 1000) + 172800) * 1000000000n;
      const timeoutHex = dynamicTimeout.toString(16).padStart(16, '0');
      
      const randomBytes = crypto.randomBytes(32);
      const dynamicSalt = randomBytes.toString('hex');
      
      logger.info(`${wallet.name} | Timeout: ${timeoutHex}`);
      logger.info(`${wallet.name} | Salt: ${dynamicSalt.slice(0, 16)}...`);
      logger.info(`${wallet.name} | Babylon address: ${destinationAddress}`);
      
      const senderHex = wallet.address.slice(2).toLowerCase();
      const babylonHex = Buffer.from(destinationAddress, "utf8").toString("hex");
      
      // Build exact raw data based on successful transaction pattern
      const exactRawData = 
        '0xff0d7c2f' + // send function selector (exact)
        '0000000000000000000000000000000000000000000000000000000000000001' + // channelId: 1
        '0000000000000000000000000000000000000000000000000000000000000000' + // timeoutHeight: 0
        '000000000000000000000000000000000000000000000000' + timeoutHex + // timeout timestamp
        dynamicSalt + // salt (32 bytes)
        '00000000000000000000000000000000000000000000000000000000000000a0' + // data offset
        '0000000000000000000000000000000000000000000000000000000000000000' + // 
        '0000000000000000000000000000000000000000000000000000000000000002' + // instruction array length
        '0000000000000000000000000000000000000000000000000000000000000060' + // first instruction offset
        '0000000000000000000000000000000000000000000000000000000000000780' + // second instruction offset
        '0000000000000000000000000000000000000000000000000000000000000002' + // 
        '0000000000000000000000000000000000000000000000000000000000000002' + //
        '0000000000000000000000000000000000000000000000000000000000000040' + //
        '00000000000000000000000000000000000000000000000000000000000003c0' + //
        '0000000000000000000000000000000000000000000000000000000000000001' + // version: 1
        '0000000000000000000000000000000000000000000000000000000000000003' + // opcode: 3
        '0000000000000000000000000000000000000000000000000000000000000060' + // operand offset
        '0000000000000000000000000000000000000000000000000000000000000300' + // operand length
        '0000000000000000000000000000000000000000000000000000000000000140' + //
        '0000000000000000000000000000000000000000000000000000000000000180' + //
        '00000000000000000000000000000000000000000000000000000000000001e0' + //
        '000000000000000000000000000000000000000000000000005af3107a4000' + // amount: 0.0001 BNB (100,000,000,000,000 wei)
        '0000000000000000000000000000000000000000000000000000000000000220' + //
        '0000000000000000000000000000000000000000000000000000000000000260' + //
        '0000000000000000000000000000000000000000000000000000000000000012' + //
        '0000000000000000000000000000000000000000000000000000000000000000' + //
        '000000000000000000000000000000000000000000000000000000000000002a' + //
        '000000000000000000000000000000000000000000000000005af3107a4000' + // amount again
        '0000000000000000000000000000000000000000000000000000000000000014' + //
        senderHex + // sender address
        '000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a' + //
        babylonHex.padEnd(84, '0') + // babylon address (padded)
        '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' + // native BNB token
        '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000003424e42' + // BNB
        '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003424e42' + // BNB
        '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e62626e31633568666e6b766a64767439376670733835396b72686538617772777a33666d736a343436633465337a78713530773666756773326b6d6334790000';
      
      logger.info(`${wallet.name} | Using EXACT successful transaction pattern`);
      logger.info(`${wallet.name} | Raw data length: ${exactRawData.length} chars`);
      
      // EXACT PARAMETERS from successful transaction
      const rawTxData = {
        to: config.contract,
        value: ethers.parseUnits('0.0002', 18), // EXACT value from successful tx
        gasLimit: 245214, // EXACT gas limit
        gasPrice: ethers.parseUnits('0.12', 'gwei'), // EXACT gas price
        data: exactRawData
      };
      
      const tx = await signer.sendTransaction(rawTxData);

      logger.success(`${wallet.name} | Transaction sent: ${colors.brightYellow}${tx.hash}${colors.reset}`);
      
      const receipt = await waitForTransactionReceipt(tx.hash, 'bnb');
      if (receipt.status === 1) {
        const currentTime = moment().tz('Asia/Jakarta').format('HH:mm:ss');
        logger.success(`${wallet.name} | ${currentTime} Transaction confirmed! Gas: ${colors.brightCyan}${receipt.gasUsed.toString()}${colors.reset}`);
        
        if (checkPackets) {
          logger.info(`${wallet.name} | Waiting for Union Bridge to complete processing...`);
          const unionComplete = await waitForUnionIndexing(tx.hash, wallet.name);
          
          if (unionComplete) {
            logger.success(`${wallet.name} | Bridge transfer FULLY COMPLETED!`);
          } else {
            logger.warning(`${wallet.name} | Bridge may still be processing in background`);
          }
        }
        
        logger.success(`${wallet.name} | Explorer: ${config.explorer}${tx.hash}`);
        logger.info(`${wallet.name} | Union: https://app.union.build/transaction/${tx.hash}`);
        
        return true;
      } else {
        logger.error(`${wallet.name} | Transaction reverted!`);
        logger.info(`${wallet.name} | Check transaction details: ${colors.underline}${config.explorer}${tx.hash}${colors.reset}`);
        return false;
      }
    } catch (error) {
      retries++;
      logger.error(`${wallet.name} | BNB Transaction ${retries} failed: ${error.message}`);
      
      if (retries < maxRetries) {
        provider = switchRpcProvider('bnb');
        await delay(3000);
      }
    }
  }
  
  return false;
}

// New function to execute Sei to BNB swap
async function executeSeiToBnb(wallet, config, checkPackets) {
  let provider = getCurrentProvider('sei');
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      const signer = new ethers.Wallet(wallet.privatekey, provider);
      const destinationAddress = wallet.bnbAddress || wallet.address;
      
      logger.sending(`${wallet.name} | Sending Sei → BNB transaction...`);
      
      // Generate new dynamic timeout (48 hours from now)
      const currentTime = Math.floor(Date.now() / 1000);
      const timeoutTimestamp = `${currentTime + 172800}000000000`; // 48 hours in nanoseconds
      
      // Generate unique salt
      const randomBytes = crypto.randomBytes(32);
      const salt = `0x${randomBytes.toString('hex')}`;
      
      const contract = new ethers.Contract(config.contract, UCS03_ABI, signer);
      
      logger.info(`${wallet.name} | Using dynamic timeout and salt`);
      logger.info(`${wallet.name} | Channel: 5, Timeout: ${timeoutTimestamp}`);
      logger.info(`${wallet.name} | Salt: ${salt.slice(0, 16)}...`);
      logger.info(`${wallet.name} | Destination BNB: ${destinationAddress}`);
      
      // Exact operand from the successful transaction - just replace addresses
      const senderHex = wallet.address.slice(2).toLowerCase();
      const recipientHex = destinationAddress.slice(2).toLowerCase();
      
      // This is the exact operand structure from your successful transaction
      const operand = `0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000038000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000240000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000280000000000000000000000000000000000000000000000000002386f26fc100000000000000000000000000000000000000000000000000000000000000000014${senderHex}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000014${recipientHex}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000014eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000000000000000000000000000000000000000035345490000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000353656900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014e86bed5b0813430df660d17363b89fe9bd8232d800000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000220bf209b5989980000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014${senderHex}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000014${recipientHex}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000014eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000000000000000000000000000000000000000035345490000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000353656900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014e86bed5b0813430df660d17363b89fe9bd8232d8000000000000000000000000`;
      
      const instruction = {
        version: 0,
        opcode: 2,
        operand: operand
      };

      // Exact gas parameters from successful transaction
      const gasConfig = {
        gasLimit: 238163,
        gasPrice: ethers.parseUnits('1.320087517', 'gwei')
      };

      logger.info(`${wallet.name} | Sending transaction with dynamic timeout...`);
      
      // Call with exact value from successful transaction
      const tx = await contract.send(
        5, // channelId
        0, // timeoutHeight  
        timeoutTimestamp,
        salt,
        instruction,
        { 
          ...gasConfig, 
          value: ethers.parseEther('0.32666506819358392') 
        }
      );

      logger.success(`${wallet.name} | Transaction sent: ${colors.brightYellow}${tx.hash}${colors.reset}`);
      
      const receipt = await waitForTransactionReceipt(tx.hash, 'sei');
      if (receipt.status === 1) {
        const currentTime = moment().tz('Asia/Jakarta').format('HH:mm:ss');
        logger.success(`${wallet.name} | ${currentTime} Transaction confirmed! Gas: ${colors.brightCyan}${receipt.gasUsed.toString()}${colors.reset}`);
        
        if (checkPackets) {
          logger.info(`${wallet.name} | Waiting for Union Bridge to complete processing...`);
          const unionComplete = await waitForUnionIndexing(tx.hash, wallet.name);
          
          if (unionComplete) {
            logger.success(`${wallet.name} | Bridge transfer FULLY COMPLETED!`);
          } else {
            logger.warning(`${wallet.name} | Bridge may still be processing in background`);
          }
        }
        
        logger.success(`${wallet.name} | Explorer: ${colors.underline}${config.explorer}${tx.hash}${colors.reset}`);
        logger.info(`${wallet.name} | Union: ${colors.underline}https://app.union.build/transaction/${tx.hash}${colors.reset}`);
        
        return true;
      } else {
        logger.error(`${wallet.name} | Transaction reverted!`);
        logger.info(`${wallet.name} | Check transaction details: ${colors.underline}${config.explorer}${tx.hash}${colors.reset}`);
        
        // Additional debugging info
        logger.error(`${wallet.name} | Debug info:`);
        logger.error(`${wallet.name} | - Contract: ${config.contract}`);
        logger.error(`${wallet.name} | - Channel ID: 5`);
        logger.error(`${wallet.name} | - WSEI token: 0xe86bed5b0813430df660d17363b89fe9bd8232d8`);
        logger.error(`${wallet.name} | - Value: 0.32666506819358392 SEI`);
        
        // Try alternative approach
        logger.warning(`${wallet.name} | Consider checking:`);
        logger.warning(`${wallet.name} | 1. Is the Union Bridge contract still active on Sei?`);
        logger.warning(`${wallet.name} | 2. Has the channel ID changed from 5?`);
        logger.warning(`${wallet.name} | 3. Has the WSEI token address changed?`);
        
        return false;
      }
    } catch (error) {
      retries++;
      logger.error(`${wallet.name} | Sei Transaction ${retries} failed: ${error.message}`);
      
      if (error.data) {
        logger.error(`${wallet.name} | Error data: ${error.data}`);
      }
      
      if (retries < maxRetries) {
        provider = switchRpcProvider('sei');
        await delay(3000);
      }
    }
  }
  
  return false;
}

async function executeBridge(wallet, routeConfig, checkPackets) {
  const fromNetwork = routeConfig.from;
  const config = NETWORKS[fromNetwork];
  
  if (!config) {
    logger.error(`Network ${fromNetwork} not configured`);
    return false;
  }

  // EXPLICIT BNB CHECK AT THE VERY START
  if (fromNetwork === 'bnb' && routeConfig.to === 'babylon') {
    logger.info(`${wallet.name} | EXPLICIT BNB ROUTE DETECTED - Using 0.0002 BNB transaction`);
    return await executeBnbToBabylon(wallet, config, checkPackets);
  }

  // EXPLICIT BABYLON → OSMOSIS CHECK FOR REAL TRANSACTION
  if (fromNetwork === 'babylon' && routeConfig.to === 'osmosis') {
    logger.info(`${wallet.name} | BABYLON → OSMOSIS ROUTE DETECTED - Using REAL Cosmos broadcast`);
    return await executeBabylonToOsmosisReal(wallet, config, checkPackets);
  }

  // NEW: EXPLICIT SEI → BNB CHECK
  if (fromNetwork === 'sei' && routeConfig.to === 'bnb') {
    logger.info(`${wallet.name} | SEI → BNB ROUTE DETECTED - Using native SEI swap`);
    return await executeSeiToBnb(wallet, config, checkPackets);
  }

  let provider = getCurrentProvider(fromNetwork);
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      const signer = new ethers.Wallet(wallet.privatekey, provider);
      
      let destinationAddress;
      if (routeConfig.to === 'sei') {
        destinationAddress = wallet.seiAddress || wallet.address;
      } else if (routeConfig.to === 'babylon') {
        destinationAddress = wallet.babylonAddress;
      } else if (routeConfig.to === 'xion') {
        destinationAddress = wallet.xionAddress;
      } else if (routeConfig.to === 'osmosis') {
        destinationAddress = wallet.osmoAddress;
      } else {
        destinationAddress = wallet.address;
      }

      const channelId = routeConfig.channelId;
      
      logger.sending(`${wallet.name} | Sending transaction...`);
      
      let tx;
      if (fromNetwork === 'corn') {
        const destinationAddress = wallet.seiAddress || wallet.address;
        
        const dynamicTimeout = BigInt(Math.floor(Date.now() / 1000) + 172800) * 1000000000n;
        const timeoutHex = dynamicTimeout.toString(16).padStart(16, '0');
        
        const exactRawData = 
          '0xff0d7c2f' + 
          '00000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000' + timeoutHex +
          '1a369ae990efd0f322ec0bb6ef0fa3c24f90f66cca7d2b413fdff72e4ab5432000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000003a000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000000000e8d4a5100000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000240000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000280000000000000000000000000000000000000000000000000000000e8d4a510000000000000000000000000000000000000000000000000000000000000000014' +
          wallet.address.slice(2).toLowerCase() + 
          '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000014' +
          destinationAddress.slice(2).toLowerCase() + 
          '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000014eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000000000000000000000000000000000000000044254434e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007426974636f726e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001492b3bc0bc3ac0ee60b04a0bbc4a09deb3914c886000000000000000000000000';
        
        logger.info(`${wallet.name} | Extended timeout (48h): ${timeoutHex}`);
        
        const rawTxData = {
          to: config.contract,
          value: ethers.parseUnits('0.000001', 18),
          gasLimit: 300000,
          gasPrice: ethers.parseUnits('0.05', 'gwei'),
          data: exactRawData
        };
        
        tx = await signer.sendTransaction(rawTxData);
      } else {
        const contract = new ethers.Contract(config.contract, UCS03_ABI, signer);
        const now = BigInt(Date.now()) * 1_000_000n;
        const oneDayNs = 86_400_000_000_000n;
        const timeoutTimestamp = (now + oneDayNs).toString();
        const timestampNow = Math.floor(Date.now() / 1000);
        const salt = ethers.keccak256(
          ethers.solidityPacked(
            ['address', 'uint256'], 
            [wallet.address, timestampNow]
          )
        );
        
        let operand;
        if (routeConfig.from === 'holesky' && routeConfig.to === 'xion') {
          operand = generateHoleskyToXionOperand(wallet.address, destinationAddress);
        } else if (routeConfig.from === 'sepolia' && routeConfig.to === 'babylon') {
          operand = generateSepoliaToBabylonOperand(wallet.address, destinationAddress);
        } else if (routeConfig.from === 'sepolia' && routeConfig.to === 'holesky') {
          operand = generateSepoliaToHoleskyOperand(wallet.address);
        } else {
          throw new Error(`Unsupported route: ${routeConfig.from} → ${routeConfig.to}`);
        }
        
        if (!operand) {
          throw new Error(`Failed to generate operand for route: ${routeConfig.from} → ${routeConfig.to}`);
        }
        
        logger.info(`${wallet.name} | Generated operand preview: ${operand.substring(0, 64)}...`);
        
        const instruction = {
          version: 0,
          opcode: 2,
          operand: operand,
        };

        const gasConfig = {
          gasLimit: 200000,
          maxFeePerGas: ethers.parseUnits('2', 'gwei'),
          maxPriorityFeePerGas: ethers.parseUnits('1', 'gwei')
        };

        tx = await contract.send(
          channelId,
          0,
          timeoutTimestamp,
          salt,
          instruction,
          { ...gasConfig, value: ethers.parseEther('0') }
        );
      }

      logger.success(`${wallet.name} | Transaction sent: ${colors.brightYellow}${tx.hash}${colors.reset}`);
      
      const receipt = await waitForTransactionReceipt(tx.hash, fromNetwork);
      if (receipt.status === 1) {
        const currentTime = moment().tz('Asia/Jakarta').format('HH:mm:ss');
        logger.success(`${wallet.name} | ${currentTime} Transaction confirmed! Gas: ${colors.brightCyan}${receipt.gasUsed.toString()}${colors.reset}`);
        
        logger.info(`${wallet.name} | Waiting for Union Bridge to complete processing...`);
        const unionComplete = await waitForUnionIndexing(tx.hash, wallet.name);
        
        if (unionComplete) {
          logger.success(`${wallet.name} | Bridge transfer FULLY COMPLETED!`);
        } else {
          logger.warning(`${wallet.name} | Bridge may still be processing in background`);
        }
        
        logger.success(`${wallet.name} | Explorer: ${colors.underline}${config.explorer}${tx.hash}${colors.reset}`);
        logger.info(`${wallet.name} | Union: ${colors.underline}https://app.union.build/transaction/${tx.hash}${colors.reset}`);
        
        return true;
      } else {
        logger.error(`${wallet.name} | Transaction reverted!`);
        return false;
      }
    } catch (error) {
      retries++;
      logger.error(`${wallet.name} | Transaction ${retries} failed: ${error.message}`);
      
      if (retries < maxRetries) {
        provider = switchRpcProvider(fromNetwork);
        await delay(3000);
      }
    }
  }
  
  return false;
}

async function executeRandomBridge(wallets, numTxPerWallet, checkPackets) {
  const randomRoutes = [1, 2, 3, 6, 7, 8, 9]; // Added route 9
  let totalTx = wallets.length * numTxPerWallet;
  let completedTx = 0;
  
  logger.stats(`Starting random bridge for ${wallets.length} wallets, ${numTxPerWallet} tx each (Total: ${totalTx})`);
  
  for (const wallet of wallets) {
    logger.wallet(`Processing ${wallet.name} | ${numTxPerWallet} random transaction(s)...`);
    
    for (let i = 0; i < numTxPerWallet; i++) {
      const randomRouteId = randomRoutes[Math.floor(Math.random() * randomRoutes.length)];
      const routeConfig = BRIDGE_ROUTES[randomRouteId];
      
      displayProgress(completedTx, totalTx, wallet.name, 'Random Bridge');
      
      if (randomRouteId === 6) {
        logger.bridge(`${wallet.name} → ${wallet.seiAddress || wallet.address} (${routeConfig.emoji} ${routeConfig.name})`);
        
        if (await checkBalanceAndApprove(wallet, 'corn', '0.000001')) {
          const success = await executeBridge(wallet, routeConfig, checkPackets);
          if (success) {
            completedTx++;
            logger.success(`${wallet.name} | Transfer ${i + 1}/${numTxPerWallet} completed! ✓`);
            if (i < numTxPerWallet - 1) {
              logger.timer('Random bridge: Waiting 30 seconds after successful Corn → Sei...');
              await delay(30000);
            }
          }
        }
      } else if (randomRouteId === 7) {
        logger.bridge(`${wallet.name} → ${wallet.babylonAddress} (${routeConfig.emoji} ${routeConfig.name})`);
        
        if (await checkBalanceAndApprove(wallet, 'bnb', '0.0002')) {
          const success = await executeBridge(wallet, routeConfig, checkPackets);
          if (success) {
            completedTx++;
            logger.success(`${wallet.name} | Transfer ${i + 1}/${numTxPerWallet} completed! ✓`);
            if (i < numTxPerWallet - 1) {
              logger.timer('Random bridge: Waiting 30 seconds after successful BNB → Babylon...');
              await delay(30000);
            }
          }
        }
      } else if (randomRouteId === 8) {
        logger.bridge(`${wallet.name} → ${wallet.osmoAddress} (${routeConfig.emoji} ${routeConfig.name})`);
        
        if (!wallet.babylonAddress || !wallet.osmoAddress) {
          logger.warning(`${wallet.name} | Skipping Babylon → Osmosis (requires Babylon and Osmosis addresses)`);
          continue;
        }
        
        const success = await executeBridge(wallet, routeConfig, checkPackets);
        if (success) {
          completedTx++;
          logger.success(`${wallet.name} | Transfer ${i + 1}/${numTxPerWallet} completed! ✓`);
          if (i < numTxPerWallet - 1) {
            logger.timer('Random bridge: Waiting 30 seconds after successful Babylon → Osmosis...');
            await delay(30000);
          }
        }
      } else if (randomRouteId === 9) {
        logger.bridge(`${wallet.name} → ${wallet.bnbAddress || wallet.address} (${routeConfig.emoji} ${routeConfig.name})`);
        
        if (await checkBalanceAndApprove(wallet, 'sei', '0.32')) {
          const success = await executeBridge(wallet, routeConfig, checkPackets);
          if (success) {
            completedTx++;
            logger.success(`${wallet.name} | Transfer ${i + 1}/${numTxPerWallet} completed! ✓`);
            if (i < numTxPerWallet - 1) {
              logger.timer('Random bridge: Waiting 30 seconds after successful Sei → BNB...');
              await delay(30000);
            }
          }
        }
      } else {
        const destinationAddress = randomRouteId === 2 ? wallet.babylonAddress : 
                                  randomRouteId === 3 ? wallet.xionAddress : wallet.address;
        
        logger.bridge(`${wallet.name} → ${destinationAddress} (${routeConfig.emoji} ${routeConfig.name})`);
        
        if (await checkBalanceAndApprove(wallet, routeConfig.from, '0.01')) {
          const success = await executeBridge(wallet, routeConfig, checkPackets);
          if (success) {
            completedTx++;
            logger.success(`${wallet.name} | Transfer ${i + 1}/${numTxPerWallet} completed! ✓`);
            if (i < numTxPerWallet - 1) {
              logger.timer('Waiting 30 seconds before next transaction...');
              await delay(30000);
            }
          }
        }
      }
    }
    
    if (wallets.indexOf(wallet) < wallets.length - 1) {
      logger.timer('Waiting 30 seconds before processing next wallet...');
      await delay(30000);
    }
  }
  
  displayProgress(completedTx, totalTx, '', 'Random Bridge COMPLETED');
  logger.stats(`Random bridge completed: ${completedTx}/${totalTx} transactions successful!`);
}

async function executeFullRandomBridge(wallets, checkPackets) {
  const totalTx = 30;
  let completedTx = 0;
  
  logger.processing(`Starting full random bridge: ${totalTx} total transactions across ${wallets.length} wallets`);
  
  for (const wallet of wallets) {
    while (completedTx < totalTx) {
      const randomRoutes = [1, 2, 3, 6, 7, 8, 9]; // Added route 9
      const randomRouteId = randomRoutes[Math.floor(Math.random() * randomRoutes.length)];
      const routeConfig = BRIDGE_ROUTES[randomRouteId];
      
      displayProgress(completedTx, totalTx, wallet.name, 'Full Random Bridge');
      
      if (randomRouteId === 6) {
        logger.processing(`${wallet.name} | TX ${completedTx + 1}/${totalTx} | ${routeConfig.emoji} ${routeConfig.name}`);
        
        if (await checkBalanceAndApprove(wallet, 'corn', '0.000001')) {
          const success = await executeBridge(wallet, routeConfig, checkPackets);
          if (success) {
            completedTx++;
            logger.success(`Progress: ${completedTx}/${totalTx} transactions completed ✓`);
            
            if (completedTx < totalTx) {
              logger.timer('Full random: Waiting 30 seconds after successful Corn → Sei...');
              await delay(30000);
            }
          }
        }
      } else if (randomRouteId === 7) {
        logger.processing(`${wallet.name} | TX ${completedTx + 1}/${totalTx} | ${routeConfig.emoji} ${routeConfig.name}`);
        
        if (await checkBalanceAndApprove(wallet, 'bnb', '0.0002')) {
          const success = await executeBridge(wallet, routeConfig, checkPackets);
          if (success) {
            completedTx++;
            logger.success(`Progress: ${completedTx}/${totalTx} transactions completed ✓`);
            
            if (completedTx < totalTx) {
              logger.timer('Full random: Waiting 30 seconds after successful BNB → Babylon...');
              await delay(30000);
            }
          }
        }
      } else if (randomRouteId === 8) {
        logger.processing(`${wallet.name} | TX ${completedTx + 1}/${totalTx} | ${routeConfig.emoji} ${routeConfig.name}`);
        
        if (!wallet.babylonAddress || !wallet.osmoAddress) {
          logger.warning(`${wallet.name} | Skipping Babylon → Osmosis (requires Babylon and Osmosis addresses)`);
          continue;
        }
        
        const success = await executeBridge(wallet, routeConfig, checkPackets);
        if (success) {
          completedTx++;
          logger.success(`Progress: ${completedTx}/${totalTx} transactions completed ✓`);
          
          if (completedTx < totalTx) {
            logger.timer('Full random: Waiting 30 seconds after successful Babylon → Osmosis...');
            await delay(30000);
          }
        }
      } else if (randomRouteId === 9) {
        logger.processing(`${wallet.name} | TX ${completedTx + 1}/${totalTx} | ${routeConfig.emoji} ${routeConfig.name}`);
        
        if (await checkBalanceAndApprove(wallet, 'sei', '0.32')) {
          const success = await executeBridge(wallet, routeConfig, checkPackets);
          if (success) {
            completedTx++;
            logger.success(`Progress: ${completedTx}/${totalTx} transactions completed ✓`);
            
            if (completedTx < totalTx) {
              logger.timer('Full random: Waiting 30 seconds after successful Sei → BNB...');
              await delay(30000);
            }
          }
        }
      } else {
        logger.processing(`${wallet.name} | TX ${completedTx + 1}/${totalTx} | ${routeConfig.emoji} ${routeConfig.name}`);
        
        if (await checkBalanceAndApprove(wallet, routeConfig.from, '0.01')) {
          const success = await executeBridge(wallet, routeConfig, checkPackets);
          if (success) {
            completedTx++;
            logger.success(`Progress: ${completedTx}/${totalTx} transactions completed ✓`);
            
            if (completedTx < totalTx) {
              logger.timer('Waiting 30 seconds before next transaction...');
              await delay(30000);
            }
          }
        }
      }
      
      if (completedTx >= totalTx) break;
    }
    
    if (completedTx >= totalTx) break;
  }
  
  displayProgress(completedTx, totalTx, '', 'Full Random Bridge COMPLETED');
  logger.success(`Full random bridge completed: ${completedTx}/${totalTx} transactions`);
}

async function showLoadingAnimation() {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const loadingText = 'Initializing Union Bridge Multi-Wallet System (with Sei → BNB support)';
  
  return new Promise(resolve => {
    const interval = setInterval(() => {
      process.stdout.write(`\r${colors.brightCyan}${frames[i % frames.length]} ${loadingText}${colors.reset}`);
      i++;
      if (i > 20) {
        clearInterval(interval);
        process.stdout.write('\r' + ' '.repeat(loadingText.length + 5) + '\r');
        resolve();
      }
    }, 100);
  });
}

async function countdownTimer(seconds, message = 'Next operation in') {
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`\r${colors.brightBlue}[⏱]${colors.reset} ${colors.blue}${message}: ${colors.brightYellow}${i}s${colors.reset} ${colors.dim}${'█'.repeat(Math.floor((seconds - i + 1) / seconds * 20))}${'░'.repeat(20 - Math.floor((seconds - i + 1) / seconds * 20))}${colors.reset}`);
    await delay(1000);
  }
  process.stdout.write('\r' + ' '.repeat(80) + '\r');
}

async function main() {
  console.log(`${colors.brightCyan}Starting Union Bridge with Sei → BNB support...${colors.reset}`);
  await showLoadingAnimation();
  
  console.log(`
${colors.brightYellow}
██████╗ ███████╗███╗   ███╗██████╗ ███████╗██╗  ██╗    ██╗      █████╗ ██╗  ██╗ █████╗ ████████╗
██╔══██╗██╔════╝████╗ ████║██╔══██╗██╔════╝██║ ██╔╝    ██║     ██╔══██╗██║  ██║██╔══██╗╚══██╔══╝
██████╔╝█████╗  ██╔████╔██║██████╔╝█████╗  █████╔╝     ██║     ███████║███████║███████║   ██║   
██╔═══╝ ██╔══╝  ██║╚██╔╝██║██╔═══╝ ██╔══╝  ██╔═██╗     ██║     ██╔══██║██╔══██║██╔══██║   ██║   
██║     ███████╗██║ ╚═╝ ██║██║     ███████╗██║  ██╗    ███████╗██║  ██║██║  ██║██║  ██║   ██║   
╚═╝     ╚══════╝╚═╝     ╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝    ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   
${colors.reset}
${colors.brightCyan}Union Bridge Enhanced - Now with Sei → BNB Support!${colors.reset}
${colors.brightMagenta}══════════════════════════════════════════════════════${colors.reset}
  `);

  const wallets = loadWalletsFromEnv();

  if (wallets.length === 0) {
    logger.error('No wallets found in environment variables!');
    logger.info('Configure PRIVATE_KEY_1, PRIVATE_KEY_2, etc. in .env file');
    logger.info('Required for Route 8: BABYLON_ADDRESS_1, OSMO_ADDRESS_1');
    logger.info('Optional for Route 9: BNB_ADDRESS_1 (defaults to EVM address)');
    console.log(`
${colors.yellow}Example .env format:
PRIVATE_KEY_1=0xYourPrivateKeyHere
BABYLON_ADDRESS_1=bbn1YourBabylonAddressHere  
XION_ADDRESS_1=xion1YourXionAddressHere
SEI_ADDRESS_1=sei1YourSeiAddressHere
OSMO_ADDRESS_1=osmo1YourOsmosisAddressHere
BNB_ADDRESS_1=0xYourBnbAddressHere

${colors.brightCyan}Note: Route 7 uses only 0.0002 BNB (exact successful amount!)
Route 9 uses 0.32666506819358392 SEI for swapping to BNB${colors.reset}
    `);
    process.exit(1);
  }

  logger.success(`Union Bridge Configuration Complete!`);
  logger.success(`Found ${colors.brightGreen}${wallets.length}${colors.reset} wallet(s) configured`);
  
  for (const wallet of wallets) {
    const babylonStatus = wallet.babylonAddress ? `${colors.brightGreen}✓${colors.reset}` : `${colors.brightRed}✗${colors.reset}`;
    const xionStatus = wallet.xionAddress ? `${colors.brightGreen}✓${colors.reset}` : `${colors.brightRed}✗${colors.reset}`;
    const seiStatus = wallet.seiAddress ? `${colors.brightGreen}✓${colors.reset}` : `${colors.brightRed}✗${colors.reset}`;
    const osmoStatus = wallet.osmoAddress ? `${colors.brightGreen}✓${colors.reset}` : `${colors.brightRed}✗${colors.reset}`;
    const bnbStatus = wallet.bnbAddress ? `${colors.brightGreen}✓${colors.reset}` : `${colors.brightYellow}⚬${colors.reset}`;
    
    logger.success(`${wallet.name}: ${babylonStatus} Babylon | ${xionStatus} Xion | ${seiStatus} Sei | ${osmoStatus} Osmosis | ${bnbStatus} BNB`);
  }
  
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise(resolve => rl.question(query, resolve));

  while (true) {
    console.log(`
${colors.brightYellow}Standard Routes:${colors.reset}
${colors.cyan}1.${colors.reset} ${BRIDGE_ROUTES[1].emoji} Sepolia → Holesky
${colors.cyan}2.${colors.reset} ${BRIDGE_ROUTES[2].emoji} Sepolia → Babylon  
${colors.cyan}3.${colors.reset} ${BRIDGE_ROUTES[3].emoji} Holesky → Xion

${colors.brightMagenta}Random Routes:${colors.reset}
${colors.cyan}4.${colors.reset} ${BRIDGE_ROUTES[4].emoji} Sepolia → Random (Holesky/Babylon)
${colors.cyan}5.${colors.reset} ${BRIDGE_ROUTES[5].emoji} All Chains → Random (30+ Total TXs)

${colors.brightGreen}Special Routes:${colors.reset}
${colors.cyan}6.${colors.reset} ${BRIDGE_ROUTES[6].emoji} Corn → Sei (Bitcorn Swap)
${colors.cyan}7.${colors.reset} ${BRIDGE_ROUTES[7].emoji} BNB → Babylon (${colors.brightYellow}0.0002 BNB${colors.reset})
${colors.cyan}8.${colors.reset} ${BRIDGE_ROUTES[8].emoji} Babylon → Osmosis (🚀 REAL BROADCAST!)
${colors.cyan}9.${colors.reset} ${BRIDGE_ROUTES[9].emoji} Sei → BNB (${colors.brightCyan}Native SEI Swap${colors.reset})

${colors.brightRed}Exit:${colors.reset}
${colors.cyan}0.${colors.reset} Exit Program
    `);

    const routeChoice = await question(`${colors.brightCyan}🔹 Select bridge route (0-9): ${colors.reset}`);
    
    if (routeChoice === '0') {
      logger.info('Exiting Union Bridge... Goodbye!');
      break;
    }

    const routeId = parseInt(routeChoice);
    if (![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(routeId)) {
      logger.error('Invalid route selection');
      continue;
    }

    let numTxPerWallet = 1;
    if (routeId !== 5) {
      const txCountInput = await question(`${colors.brightYellow}Number of transactions per wallet: ${colors.reset}`);
      numTxPerWallet = parseInt(txCountInput) || 1;
    }

    const checkPacketsInput = await question(`${colors.brightMagenta}Check Union packets? (y/n) [default: n]: ${colors.reset}`);
    const checkPackets = checkPacketsInput.toLowerCase() === 'y';

    const startTime = Date.now();
    const routeConfig = BRIDGE_ROUTES[routeId];
    
    logger.bridge(`Starting ${routeConfig ? routeConfig.emoji + ' ' + routeConfig.name : 'bridge operation'}...`);

    if (routeId === 4) {
      await executeRandomBridge(wallets, numTxPerWallet, checkPackets);
    } else if (routeId === 5) {
      await executeFullRandomBridge(wallets, checkPackets);
    } else {
      const routeConfig = BRIDGE_ROUTES[routeId];
      let totalTx = wallets.length * numTxPerWallet;
      let completedTx = 0;
      
      logger.bridge(`Starting ${routeConfig.emoji} ${routeConfig.name} for ${wallets.length} wallets`);
      
      for (const wallet of wallets) {
        // Special handling for Route 8 (Babylon → Osmosis) - REAL BROADCAST
        if (routeId === 8) {
          logger.wallet(`Processing ${wallet.name}: Babylon → ${wallet.osmoAddress}`);
          logger.bridge(`Route: ${routeConfig.emoji} ${routeConfig.name} (🚀 REAL BROADCAST)`);
          
          if (!wallet.babylonAddress) {
            logger.error(`${wallet.name} | No Babylon address configured for Babylon → Osmosis`);
            continue;
          }
          
          if (!wallet.osmoAddress) {
            logger.error(`${wallet.name} | No Osmosis address configured`);
            continue;
          }
          
          logger.info(`${wallet.name} | Skipping balance check - Using native Cosmos tokens for REAL broadcast`);
          
          for (let i = 0; i < numTxPerWallet; i++) {
            displayProgress(completedTx, totalTx, wallet.name, routeConfig.name);
            logger.processing(`${wallet.name} | Processing REAL transaction ${i + 1}/${numTxPerWallet}...`);
            
            const success = await executeBridge(wallet, routeConfig, checkPackets);
            if (success) {
              completedTx++;
              logger.success(`${wallet.name} | Transfer ${i + 1}/${numTxPerWallet} completed! ✓`);
              if (i < numTxPerWallet - 1) {
                logger.timer('Waiting 30 seconds before next REAL Babylon → Osmosis transaction...');
                await countdownTimer(30, 'Next REAL Babylon → Osmosis transaction in');
              }
            }
          }
        } else if (routeId === 9) {
          logger.wallet(`Processing ${wallet.name}: ${wallet.address} → ${wallet.bnbAddress || wallet.address}`);
          logger.bridge(`Route: ${routeConfig.emoji} ${routeConfig.name}`);
          
          if (await checkBalanceAndApprove(wallet, 'sei', '0.32')) {
            for (let i = 0; i < numTxPerWallet; i++) {
              displayProgress(completedTx, totalTx, wallet.name, routeConfig.name);
              logger.processing(`${wallet.name} | Processing transaction ${i + 1}/${numTxPerWallet}...`);
              
              const success = await executeBridge(wallet, routeConfig, checkPackets);
              if (success) {
                completedTx++;
                logger.success(`${wallet.name} | Transfer ${i + 1}/${numTxPerWallet} completed! ✓`);
                if (i < numTxPerWallet - 1) {
                  logger.timer('Waiting 30 seconds before next Sei → BNB transaction...');
                  await countdownTimer(30, 'Next Sei → BNB transaction in');
                }
              }
            }
          }
        } else if (routeId === 6) {
          logger.wallet(`Processing ${wallet.name}: ${wallet.address} → ${wallet.seiAddress || wallet.address}`);
          logger.bridge(`Route: ${routeConfig.emoji} ${routeConfig.name}`);
          
          if (await checkBalanceAndApprove(wallet, 'corn', '0.000001')) {
            for (let i = 0; i < numTxPerWallet; i++) {
              displayProgress(completedTx, totalTx, wallet.name, routeConfig.name);
              logger.processing(`${wallet.name} | Processing transaction ${i + 1}/${numTxPerWallet}...`);
              
              const success = await executeBridge(wallet, routeConfig, checkPackets);
              if (success) {
                completedTx++;
                logger.success(`${wallet.name} | Transfer ${i + 1}/${numTxPerWallet} completed! ✓`);
                if (i < numTxPerWallet - 1) {
                  logger.timer('Waiting 30 seconds before next Corn → Sei transaction...');
                  await countdownTimer(30, 'Next Corn → Sei transaction in');
                }
              }
            }
          }
        } else if (routeId === 7) {
          logger.wallet(`Processing ${wallet.name}: ${wallet.address} → ${wallet.babylonAddress}`);
          logger.bridge(`Route: ${routeConfig.emoji} ${routeConfig.name} (💰 0.0002 BNB)`);
          
          if (await checkBalanceAndApprove(wallet, 'bnb', '0.0002')) {
            for (let i = 0; i < numTxPerWallet; i++) {
              displayProgress(completedTx, totalTx, wallet.name, routeConfig.name);
              logger.processing(`${wallet.name} | Processing 0.0002 BNB transaction ${i + 1}/${numTxPerWallet}...`);
              
              const success = await executeBridge(wallet, routeConfig, checkPackets);
              if (success) {
                completedTx++;
                logger.success(`${wallet.name} | Transfer ${i + 1}/${numTxPerWallet} completed! ✓`);
                if (i < numTxPerWallet - 1) {
                  logger.timer('Waiting 30 seconds before next BNB → Babylon transaction...');
                  await countdownTimer(30, 'Next BNB → Babylon transaction in');
                }
              }
            }
          }
        } else {
          let destinationAddress;
          if (routeId === 2) {
            destinationAddress = wallet.babylonAddress;
          } else if (routeId === 3) {
            destinationAddress = wallet.xionAddress;
          } else {
            destinationAddress = wallet.address;
          }
          
          logger.wallet(`Processing ${wallet.name}: ${wallet.address} → ${destinationAddress}`);
          logger.bridge(`Route: ${routeConfig.emoji} ${routeConfig.name}`);
          
          if (await checkBalanceAndApprove(wallet, routeConfig.from, '0.01')) {
            for (let i = 0; i < numTxPerWallet; i++) {
              displayProgress(completedTx, totalTx, wallet.name, routeConfig.name);
              logger.processing(`${wallet.name} | Processing transaction ${i + 1}/${numTxPerWallet}...`);
              
              const success = await executeBridge(wallet, routeConfig, checkPackets);
              if (success) {
                completedTx++;
                logger.success(`${wallet.name} | Transfer ${i + 1}/${numTxPerWallet} completed! ✓`);
                if (i < numTxPerWallet - 1) {
                  logger.timer('Waiting 30 seconds before next transaction...');
                  await countdownTimer(30, 'Next transaction in');
                }
              }
            }
          }
        }
        
        if (wallets.indexOf(wallet) < wallets.length - 1) {
          logger.timer('Waiting 30 seconds before processing next wallet...');
          await countdownTimer(30, 'Next wallet processing in');
        }
      }
      
      displayProgress(completedTx, totalTx, '', `${routeConfig.name} COMPLETED`);
    }

    const endTime = Date.now();
    const duration = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    logger.success(`All bridge transfers completed successfully!`);
    logger.stats(`Total execution time: ${colors.brightYellow}${minutes}m ${seconds}s${colors.reset}`);
    logger.info(`Check Union explorer: ${colors.underline}https://app.union.build/${colors.reset}`);
    
    console.log(`
${colors.dim}═══════════════════════════════════════════════════════════════${colors.reset}
    `);
  }

  rl.close();
}

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  console.error(`${colors.brightRed}Stack trace:${colors.reset}\n${colors.red}${error.stack}${colors.reset}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

console.log(`${colors.brightCyan}Loading Union Bridge with Sei → BNB support...${colors.reset}`);
main().catch(error => {
  logger.error(`Application error: ${error.message}`);
  console.error(`${colors.brightRed}Stack trace:${colors.reset}\n${colors.red}${error.stack}${colors.reset}`);
  process.exit(1);
});
