const { ethers, JsonRpcProvider } = require('ethers');
const axios = require('axios');
const moment = require('moment-timezone');
const readline = require('readline');
require('dotenv').config();

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bold: "\x1b[1m"
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log('██████╗░███████╗███╗░░░███╗██████╗░███████╗██╗░░██╗  ██╗░░░░░░█████╗░██╗░░██╗░█████╗░████████╗');
    console.log('██╔══██╗██╔════╝████╗░████║██╔══██╗██╔════╝██║░██╔╝  ██║░░░░░██╔══██╗██║░░██║██╔══██╗╚══██╔══╝');
    console.log('██████╔╝█████╗░░██╔████╔██║██████╔╝█████╗░░█████═╝░  ██║░░░░░███████║███████║███████║░░░██║░░░');
    console.log('██╔═══╝░██╔══╝░░██║╚██╔╝██║██╔═══╝░██╔══╝░░██╔═██╗░  ██║░░░░░██╔══██║██╔══██║██╔══██║░░░██║░░░');
    console.log('██║░░░░░███████╗██║░╚═╝░██║██║░░░░░███████╗██║░╚██╗  ███████╗██║░░██║██║░░██║██║░░██║░░░██║░░░');
    console.log('╚═╝░░░░░╚══════╝╚═╝░░░░░╚═╝╚═╝░░░░░╚══════╝╚═╝░░╚═╝  ╚══════╝╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚═╝░░░╚═╝░░░');
    console.log('                                                                                                  ');
    console.log('                                                                                                  ');
  }
};

// UCS03 ABI untuk send function
const UCS03_ABI = [
  {
    inputs: [
      { internalType: 'uint32', name: 'channelId', type: 'uint32' },
      { internalType: 'uint64', name: 'timeoutHeight', type: 'uint64' },
      { internalType: 'uint64', name: 'timeoutTimestamp', type: 'uint64' },
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
      {
        components: [
          { internalType: 'uint8', name: 'version', type: 'uint8' },
          { internalType: 'uint8', name: 'opcode', type: 'uint8' },
          { internalType: 'bytes', name: 'operand', type: 'bytes' },
        ],
        internalType: 'struct Instruction',
        name: 'instruction',
        type: 'tuple',
      },
    ],
    name: 'send',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

const USDC_ABI = [
  {
    constant: true,
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
    stateMutability: 'view',
  },
  {
    constant: true,
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
    stateMutability: 'view',
  },
  {
    constant: false,
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
    stateMutability: 'nonpayable',
  },
];

// Network configurations
const NETWORKS = {
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    contractAddress: '0x5FbE74A283f7954f10AA04C2eDf55578811aeb03',
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    rpcProviders: [new JsonRpcProvider('https://eth-sepolia.public.blastapi.io')],
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  holesky: {
    chainId: 17000,
    name: 'Holesky',
    contractAddress: '0x5fbe74a283f7954f10aa04c2edf55578811aeb03',
    usdcAddress: '0x57978Bfe465ad9B1c0bf80f6C1539d300705EA50',
    rpcProviders: [
      new JsonRpcProvider('https://ethereum-holesky-rpc.publicnode.com'),
      new JsonRpcProvider('https://holesky.drpc.org'),
      new JsonRpcProvider('https://1rpc.io/holesky'),
      new JsonRpcProvider('https://endpoints.omniatech.io/v1/eth/holesky/public')
    ],
    explorerUrl: 'https://holesky.etherscan.io',
  }
};

// Bridge routes configuration
const BRIDGE_ROUTES = {
  1: { from: 'sepolia', to: 'holesky', channelId: 8, displayName: 'Sepolia → Holesky' },
  2: { from: 'sepolia', to: 'babylon', channelId: 7, displayName: 'Sepolia → Babylon' },
  3: { from: 'holesky', to: 'xion', channelId: 4, displayName: 'Holesky → Xion' },
  4: { from: 'sepolia', to: 'random', channelId: null, displayName: 'Sepolia → Random (Holesky/Babylon)' },
  5: { from: 'all', to: 'random', channelId: null, displayName: 'All Chains → Random (30 Total TXs)' },
};

const graphqlEndpoint = 'https://graphql.union.build/v1/graphql';

let currentRpcProviderIndexes = { sepolia: 0, holesky: 0 };

function getProvider(networkName) {
  const network = NETWORKS[networkName];
  const index = currentRpcProviderIndexes[networkName];
  return network.rpcProviders[index];
}

function rotateRpcProvider(networkName) {
  const network = NETWORKS[networkName];
  currentRpcProviderIndexes[networkName] = (currentRpcProviderIndexes[networkName] + 1) % network.rpcProviders.length;
  return getProvider(networkName);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function timelog() {
  return moment().tz('Asia/Jakarta').format('HH:mm:ss');
}

function header() {
  process.stdout.write('\x1Bc');
  logger.banner();
}

// Generate operand untuk Holesky → Xion
function generateHoleskyToXionOperand(fromAddress, xionAddress) {
  const senderHex = fromAddress.slice(2).toLowerCase();
  const xionHex = Buffer.from(xionAddress, "utf8").toString("hex");
  
  const operand = `0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000002710000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000002600000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000000000000000027100000000000000000000000000000000000000000000000000000000000000014${senderHex}000000000000000000000000000000000000000000000000000000000000000000000000000000000000002b${xionHex}000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001457978bfe465ad9b1c0bf80f6c1539d300705ea500000000000000000000000000000000000000000000000000000000000000000000000000000000000000004555344430000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000045553444300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003f78696f6e316b76377a7278686364723537363261727732327734716b6871726c307164783574746d6673687978746739346e356b6b6d37677336333276326600`;
  
  return operand;
}

// Generate operand untuk Sepolia → Babylon
function generateSepoliaToBabylonOperand(fromAddress, babylonAddress) {
  const senderHex = fromAddress.slice(2).toLowerCase();
  const recipientHex = Buffer.from(babylonAddress, "utf8").toString("hex");
  
  const operand = `0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000002710000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000002600000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000000000000000027100000000000000000000000000000000000000000000000000000000000000014${senderHex}000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a${recipientHex}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000141c7d4b196cb0c7b01d743fbc6116a902379c72380000000000000000000000000000000000000000000000000000000000000000000000000000000000000004555344430000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000045553444300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e62626e317a7372763233616b6b6778646e77756c3732736674677632786a74356b68736e743377776a687030666668363833687a7035617135613068366e0000`;
  
  return operand;
}

// Generate operand untuk Sepolia → Holesky
function generateSepoliaToHoleskyOperand(fromAddress) {
  const senderHex = fromAddress.slice(2).toLowerCase();
  
  const operand = `0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000027100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000027100000000000000000000000000000000000000000000000000000000000000014${senderHex}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000014${senderHex}00000000000000000000000000000000000000000000000000000000000000000000000000000000000000141c7d4b196cb0c7b01d743fbc6116a902379c72380000000000000000000000000000000000000000000000000000000000000000000000000000000000000004555344430000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000045553444300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001457978bfe465ad9b1c0bf80f6c1539d300705ea50000000000000000000000000`;
  
  return operand;
}

async function waitForTransactionReceipt(txHash, networkName, maxAttempts = 30, intervalMs = 3000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const receipt = await getProvider(networkName).getTransactionReceipt(txHash);
      if (receipt) {
        return receipt;
      }
    } catch (error) {
      if (error.message.includes('timeout')) {
        rotateRpcProvider(networkName);
      }
    }
    await delay(intervalMs);
  }
  throw new Error(`Transaction receipt not found after ${maxAttempts} attempts`);
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
    // Silent fail
  }
  
  return null;
}

async function checkBalanceAndApprove(wallet, networkName) {
  const network = NETWORKS[networkName];
  const usdcContract = new ethers.Contract(network.usdcAddress, USDC_ABI, wallet);
  
  try {
    const balance = await usdcContract.balanceOf(wallet.address);
    const balanceFormatted = ethers.formatUnits(balance, 6);
    
    logger.info(`USDC Balance: ${balanceFormatted} USDC`);
    
    if (balance === 0n) {
      logger.error(`Insufficient USDC balance!`);
      return false;
    }

    const allowance = await usdcContract.allowance(wallet.address, network.contractAddress);
    if (allowance < ethers.parseUnits('0.01', 6)) {
      logger.loading(`Setting USDC allowance...`);
      const approveTx = await usdcContract.approve(network.contractAddress, ethers.MaxUint256, {
        gasLimit: 100000,
        maxFeePerGas: ethers.parseUnits('2', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('1', 'gwei'),
      });
      await approveTx.wait();
      logger.success(`USDC approved!`);
      await delay(2000);
    }
    
    return true;
  } catch (error) {
    logger.error(`Balance/Approve error: ${error.message}`);
    return false;
  }
}

async function executeBridge(walletInfo, routeConfig, transactionCount, checkPackets = false) {
  const sourceNetwork = NETWORKS[routeConfig.from];
  const wallet = new ethers.Wallet(walletInfo.privatekey, getProvider(routeConfig.from));
  
  // Validate destination address
  let destinationAddress;
  if (routeConfig.to === 'babylon') {
    destinationAddress = walletInfo.babylonAddress;
    if (!destinationAddress) {
      logger.warn(`Missing babylonAddress for ${walletInfo.name}`);
      return;
    }
  } else if (routeConfig.to === 'xion') {
    destinationAddress = walletInfo.xionAddress;
    if (!destinationAddress) {
      logger.warn(`Missing xionAddress for ${walletInfo.name}`);
      return;
    }
  } else if (routeConfig.to === 'holesky') {
    destinationAddress = wallet.address; // Same address for Holesky
  }

  logger.info(`${walletInfo.name}: ${wallet.address} → ${destinationAddress || 'Same Address'} (${routeConfig.displayName})`);
  
  const shouldProceed = await checkBalanceAndApprove(wallet, routeConfig.from);
  if (!shouldProceed) return;

  const contract = new ethers.Contract(sourceNetwork.contractAddress, UCS03_ABI, wallet);
  const timeoutHeight = 0;

  for (let i = 1; i <= transactionCount; i++) {
    logger.step(`${walletInfo.name} | Processing transaction ${i}/${transactionCount}...`);
    
    try {
      // Generate parameters
      const now = BigInt(Date.now()) * 1_000_000n;
      const oneDayNs = 86_400_000_000_000n;
      const timeoutTimestamp = (now + oneDayNs).toString();
      
      // Generate salt
      const timestampNow = Math.floor(Date.now() / 1000);
      const salt = ethers.keccak256(
        ethers.solidityPacked(
          ['address', 'uint256'], 
          [wallet.address, timestampNow]
        )
      );
      
      // Generate operand based on route
      let operand;
      if (routeConfig.from === 'holesky' && routeConfig.to === 'xion') {
        operand = generateHoleskyToXionOperand(wallet.address, destinationAddress);
      } else if (routeConfig.from === 'sepolia' && routeConfig.to === 'babylon') {
        operand = generateSepoliaToBabylonOperand(wallet.address, destinationAddress);
      } else if (routeConfig.from === 'sepolia' && routeConfig.to === 'holesky') {
        operand = generateSepoliaToHoleskyOperand(wallet.address);
      }
      
      const instruction = {
        version: 0,
        opcode: 2,
        operand: operand,
      };

      // Gas settings
      const gasSettings = {
        gasLimit: 200000,
        maxFeePerGas: ethers.parseUnits('2', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('1', 'gwei'),
      };

      logger.loading(`Sending transaction...`);

      // Send transaction
      const tx = await contract.send(
        routeConfig.channelId, 
        timeoutHeight, 
        timeoutTimestamp, 
        salt, 
        instruction,
        gasSettings
      );
      
      logger.success(`Transaction sent: ${tx.hash}`);
      
      // Wait for confirmation
      try {
        const receipt = await waitForTransactionReceipt(tx.hash, routeConfig.from);
        
        if (receipt.status === 1) {
          logger.success(`${timelog()} Transaction confirmed! Gas: ${receipt.gasUsed.toString()}`);
          
          // Quick packet check jika diminta
          if (checkPackets) {
            const packetHash = await quickPacketCheck(tx.hash);
            if (packetHash) {
              logger.success(`${timelog()} Union packet: ${packetHash.slice(0, 16)}...`);
            } else {
              logger.info(`Packet will appear in Union explorer shortly`);
            }
          }
          
          logger.success(`Transfer ${i}/${transactionCount} completed!`);
          logger.info(`Explorer: ${sourceNetwork.explorerUrl}/tx/${tx.hash}`);
          logger.info(`Union: https://app.union.build/transaction/${tx.hash}`);
          
          // MODIFIED: 1 minute delay after each transaction completion
          if (i < transactionCount) {
            logger.loading(`Waiting 1 minute before next transaction...`);
            await delay(60000); // 1 minute = 60,000 milliseconds
          }
          
        } else {
          logger.error(`Transaction ${i} reverted!`);
        }
        
      } catch (receiptError) {
        logger.warn(`Confirmation pending - check: ${sourceNetwork.explorerUrl}/tx/${tx.hash}`);
      }
      
    } catch (error) {
      logger.error(`Transaction ${i} failed: ${error.message.split('(')[0]}`);
      
      // Auto-retry on network errors
      if (error.message.includes('timeout') || error.message.includes('network')) {
        logger.loading('Retrying with different RPC...');
        rotateRpcProvider(routeConfig.from);
        await delay(3000);
        i--; // Retry same transaction
        continue;
      }
    }
    
    console.log('');
  }
}

async function executeRandomBridge(walletInfo, transactionCount, checkPackets = false) {
  const availableRoutes = [];
  
  // Add available routes based on configured addresses
  if (walletInfo.babylonAddress) {
    availableRoutes.push(BRIDGE_ROUTES[2]); // Sepolia → Babylon
  }
  availableRoutes.push(BRIDGE_ROUTES[1]); // Sepolia → Holesky (always available)
  
  if (availableRoutes.length === 0) {
    logger.warn(`No valid destinations for ${walletInfo.name}`);
    return;
  }
  
  for (let i = 0; i < transactionCount; i++) {
    const randomRoute = availableRoutes[Math.floor(Math.random() * availableRoutes.length)];
    logger.info(`Random selection: ${randomRoute.displayName}`);
    await executeBridge(walletInfo, randomRoute, 1, checkPackets);
  }
}

// Execute fully random bridge across all chains
async function executeFullRandomBridge(walletInfo, checkPackets = false) {
  const allRoutes = [];
  
  // Sepolia → Holesky (always available)
  allRoutes.push({ 
    route: BRIDGE_ROUTES[1], 
    count: 10,
    description: 'Sepolia → Holesky (10 TXs)' 
  });
  
  // Sepolia → Babylon (if babylon address available)
  if (walletInfo.babylonAddress) {
    allRoutes.push({ 
      route: BRIDGE_ROUTES[2], 
      count: 10,
      description: 'Sepolia → Babylon (10 TXs)' 
    });
  }
  
  // Holesky → Xion (if xion address available)
  if (walletInfo.xionAddress) {
    allRoutes.push({ 
      route: BRIDGE_ROUTES[3], 
      count: 10,
      description: 'Holesky → Xion (10 TXs)' 
    });
  }
  
  if (allRoutes.length === 0) {
    logger.warn(`No valid routes for ${walletInfo.name}`);
    return;
  }
  
  // Create randomized transaction list
  const randomizedTransactions = [];
  allRoutes.forEach(routeInfo => {
    for (let i = 0; i < routeInfo.count; i++) {
      randomizedTransactions.push({
        route: routeInfo.route,
        description: routeInfo.description.split('(')[0].trim()
      });
    }
  });
  
  // Shuffle the array randomly
  for (let i = randomizedTransactions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [randomizedTransactions[i], randomizedTransactions[j]] = [randomizedTransactions[j], randomizedTransactions[i]];
  }
  
  logger.info(`${walletInfo.name}: Starting ${randomizedTransactions.length} random transactions across all chains`);
  console.log('');
  
  // Execute randomized transactions
  for (let i = 0; i < randomizedTransactions.length; i++) {
    const { route, description } = randomizedTransactions[i];
    logger.info(`[${i + 1}/${randomizedTransactions.length}] Random: ${description}`);
    
    await executeBridge(walletInfo, route, 1, checkPackets);
  }
  
  logger.success(`${walletInfo.name}: All ${randomizedTransactions.length} random transactions completed!`);
}

async function main() {
  header();

  const wallets = [];
  let index = 1;
  
  while (true) {
    const privateKey = process.env[`PRIVATE_KEY_${index}`];
    const babylonAddress = process.env[`BABYLON_ADDRESS_${index}`];
    const xionAddress = process.env[`XION_ADDRESS_${index}`];
    if (!privateKey) break; 
    
    wallets.push({
      name: `Wallet${index}`,
      privatekey: privateKey,
      babylonAddress: babylonAddress || '',
      xionAddress: xionAddress || ''
    });
    index++;
  }

  if (wallets.length === 0) {
    logger.error(`No wallets found. Configure PRIVATE_KEY_1, BABYLON_ADDRESS_1, XION_ADDRESS_1 in .env`);
    process.exit(1);
  }

  logger.success(`Union Bridge Configuration:`);
  logger.info(`• Found ${wallets.length} wallet(s) configured`);
  for (const wallet of wallets) {
    logger.info(`  ${wallet.name}: ${wallet.babylonAddress ? '✓' : '✗'} Babylon | ${wallet.xionAddress ? '✓' : '✗'} Xion`);
  }
  console.log('');

  while (true) {
    console.log(`${colors.cyan}Bridge Routes:${colors.reset}`);
    Object.entries(BRIDGE_ROUTES).forEach(([key, route]) => {
      console.log(`${key}. ${route.displayName}`);
    });
    console.log(`6. Exit`);
    
    const routeChoice = await askQuestion(`${colors.cyan}Select bridge route (1-6): ${colors.reset}`);
    const choice = parseInt(routeChoice.trim());

    if (choice === 6) {
      logger.info(`Exiting program.`);
      rl.close();
      process.exit(0);
    }

    if (![1, 2, 3, 4, 5].includes(choice)) {
      logger.error(`Invalid option. Please select 1-6.`);
      continue;
    }

    let maxTransaction = 1;
    
    // For option 5 (all chains random), we don't ask for transaction count
    if (choice !== 5) {
      const maxTransactionInput = await askQuestion(`${colors.cyan}Number of transactions per wallet: ${colors.reset}`);
      maxTransaction = parseInt(maxTransactionInput.trim());

      if (isNaN(maxTransaction) || maxTransaction <= 0) {
        logger.error(`Invalid number. Please enter a positive number.`);
        continue;
      }
    } else {
      logger.info(`Using 30 total transactions (10 per chain) in random order`);
    }

    const packetCheckInput = await askQuestion(`${colors.cyan}Check Union packets? (y/n) [default: n]: ${colors.reset}`);
    const checkPackets = packetCheckInput.toLowerCase().trim() === 'y';

    console.log('');
    
    if (!checkPackets) {
      logger.info(`Packet checking disabled - faster execution`);
      console.log('');
    }

    const selectedRoute = BRIDGE_ROUTES[choice];
    
    for (const walletInfo of wallets) {
      if (!walletInfo.privatekey) {
        logger.warn(`Skipping ${walletInfo.name}: Missing private key`);
        continue;
      }

      if (choice === 4) {
        // Random bridge (Sepolia only)
        await executeRandomBridge(walletInfo, maxTransaction, checkPackets);
      } else if (choice === 5) {
        // Full random bridge across all chains
        await executeFullRandomBridge(walletInfo, checkPackets);
      } else {
        // Specific bridge route
        await executeBridge(walletInfo, selectedRoute, maxTransaction, checkPackets);
      }
      
      // MODIFIED: 1 minute delay between wallets
      if (wallets.indexOf(walletInfo) < wallets.length - 1) {
        logger.loading(`Waiting 1 minute before processing next wallet...`);
        await delay(60000); // 1 minute = 60,000 milliseconds
      }
    }

    logger.success('All bridge transfers completed!');
    logger.info('Check Union explorer: https://app.union.build/');
    console.log('');
  }
}

main().catch((err) => {
  logger.error(`Error: ${err.message}`);
  rl.close();
  process.exit(1);
});