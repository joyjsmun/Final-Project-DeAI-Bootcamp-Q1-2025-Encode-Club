import OpenAI from 'openai';
import { ethers } from 'ethers';
import { addressBook } from './address-book';
// --- Configuration ---
// Use process.env directly as Next.js handles .env.local loading
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
let PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'http://127.0.0.1:8545/'; // Allow fallback

// --- Validate Configuration ---
if (!OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY in environment variables');
  // Avoid throwing error at module load time in serverless env
  // The API endpoint handler should check this
}
if (!PRIVATE_KEY) {
  console.warn("⚠️ WARNING: Missing PRIVATE_KEY in environment variables.");
  console.warn("   A temporary key will be generated if needed, but actions requiring signing will fail without a funded key.");
  // Generate one on demand if needed, but it won't be useful without funds
} else {
    let formattedPrivateKey = PRIVATE_KEY as string;
    if (!formattedPrivateKey.startsWith('0x')) {
        formattedPrivateKey = '0x' + formattedPrivateKey;
    }
    if (formattedPrivateKey.length !== 66) { // 0x + 64 hex characters
        console.error('❌ Invalid private key length in environment variables. Ensure it is a 64-character hex string, optionally prefixed with 0x.');
        PRIVATE_KEY = undefined; // Invalidate key
    } else {
        PRIVATE_KEY = formattedPrivateKey; // Use the formatted key
    }
}

// --- Initialize ethers.js Wallet and Provider ---
// Initialize lazily or ensure it's safe for serverless environment
let provider: ethers.JsonRpcProvider | null = null;
let wallet: ethers.Wallet | null = null;
let selfAddress: string | null = null;

function getProvider(): ethers.JsonRpcProvider {
    if (!provider) {
        console.log('Initializing ethers.js Provider...');
        try {
            provider = new ethers.JsonRpcProvider(RPC_URL);
            console.log('Provider initialized.');
        } catch (error) {
            console.error('❌ Error initializing ethers.js Provider:', error);
            throw new Error('Failed to initialize provider'); // Re-throw for endpoint handler
        }
    }
    return provider;
}

function getWallet(): ethers.Wallet {
    if (!wallet) {
        if (!PRIVATE_KEY) {
            // console.warn("⚠️ No private key available, generating ephemeral wallet for read-only operations or address lookup.");
            // Creating a random wallet allows address lookup (`selfAddress`) but can't sign
            const randomWallet = ethers.Wallet.createRandom();
            wallet = new ethers.Wallet(randomWallet.privateKey, getProvider());
            selfAddress = wallet.address;
            console.log(`🔑 Generated temporary wallet: ${selfAddress}. Signing transactions will FAIL.`);
             throw new Error("Cannot initialize wallet: Missing PRIVATE_KEY environment variable for signing.");

        } else {
            console.log('Initializing ethers.js Wallet...');
            try {
                wallet = new ethers.Wallet(PRIVATE_KEY, getProvider());
                selfAddress = wallet.address;
                console.log(`Wallet Address: ${selfAddress}`);
                console.log('Wallet initialized successfully.');
            } catch (error) {
                console.error('❌ Error initializing ethers.js Wallet:', error);
                throw new Error('Failed to initialize wallet'); // Re-throw
            }
        }
    }
    if (!selfAddress) { // Should be set by wallet init
        selfAddress = wallet.address;
    }
    return wallet;
}

function getSelfAddress(): string {
    if (!selfAddress) {
        getWallet(); // Initialize wallet which sets selfAddress
    }
    if (!selfAddress) {
        throw new Error("Could not determine self address."); // Should not happen if wallet init works
    }
    return selfAddress;
}

// --- Initialize OpenAI Client ---
// Initialize lazily
let openai: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
    if (!openai) {
        if (!OPENAI_API_KEY) {
             throw new Error("Cannot initialize OpenAI client: Missing OPENAI_API_KEY environment variable.");
        }
        console.log('Initializing OpenAI client...');
        openai = new OpenAI({ apiKey: OPENAI_API_KEY });
        console.log('OpenAI client initialized.');
    }
    return openai;
}


// --- OpenAI Function Schemas ---

const sendErc20TransferSchema: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'sendERC20Transfer',
    description: 'Initiates an ERC20 token transfer (like WETH or USDC) on the blockchain. **Use this for ERC20 tokens, NOT for native ETH.**',
    parameters: {
      type: 'object',
      properties: {
        recipient: {
          type: 'string',
          description: 'The Ethereum address (e.g., 0x123...abc) or registered name (e.g., Alice, Bob) of the recipient. **IMPORTANT: If you are given a name, you MUST use the `lookupAddressByName` tool first to get the address before calling this tool.**',
        },
        token: {
          type: 'string',
          description: 'The symbol of the ERC20 token to transfer (e.g., USDC, WETH). **This parameter is REQUIRED for ERC20 transfers.**',
        },
        amount: {
          type: 'number',
          description: 'The amount of the token to send.',
        },
      },
      required: ['recipient', 'token', 'amount'],
    },
  },
};

const getEthBalanceSchema: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: 'function',
    function: {
        name: 'getEthBalance',
        description: 'Gets the native ETH balance of a given Ethereum address or registered name.',
        parameters: {
            type: 'object',
            properties: {
                addressOrName: { // Renamed for clarity
                    type: 'string',
                    description: 'The Ethereum address (e.g., 0x123...abc) or registered name (e.g., Alice, Bob, me) to check the balance of. **IMPORTANT: If you are given a name, you MUST use the `lookupAddressByName` tool first to get the address before calling this tool.** If checking your own balance, use "me".',
                },
            },
            required: ['addressOrName'],
        },
    },
};

const getErc20BalanceSchema: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: 'function',
    function: {
        name: 'getErc20Balance',
        description: 'Gets the balance of a specific ERC20 token for a given Ethereum address or registered name.',
        parameters: {
            type: 'object',
            properties: {
                addressOrName: { // Renamed for clarity
                    type: 'string',
                     description: 'The Ethereum address (e.g., 0x123...abc) or registered name (e.g., Alice, Bob, me) to check the balance of. **IMPORTANT: If you are given a name, you MUST use the `lookupAddressByName` tool first to get the address before calling this tool.** If checking your own balance, use "me".',
                },
                token: {
                    type: 'string',
                    description: 'The symbol of the ERC20 token (e.g., USDC, WETH)',
                },
            },
            required: ['addressOrName', 'token'],
        },
    },
};

const sendEthTransferSchema: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: 'function',
    function: {
        name: 'sendEthTransfer',
        description: 'Initiates a transfer of **native ETH** to another Ethereum address or registered name. **Do NOT use this for ERC20 tokens like WETH or USDC.**',
        parameters: {
            type: 'object',
            properties: {
                recipient: {
                    type: 'string',
                    description: 'The Ethereum address (e.g., 0x123...abc) or registered name (e.g., Alice, Bob) of the recipient. **IMPORTANT: If you are given a name, you MUST use the `lookupAddressByName` tool first to get the address before calling this tool.**',
                },
                amount: {
                    type: 'number',
                    description: 'The amount of **native ETH** to send. Do not specify a token symbol here.',
                },
            },
            required: ['recipient', 'amount'],
        },
    },
};

const getTokenAddressSchema: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: 'function',
    function: {
        name: 'getTokenAddress',
        description: 'Gets the contract address for a given ERC20 token symbol.',
        parameters: {
            type: 'object',
            properties: {
                token: {
                    type: 'string',
                    description: 'The symbol of the ERC20 token (e.g., USDC, WETH).',
                },
            },
            required: ['token'],
        },
    },
};

const lookupAddressByNameSchema: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'lookupAddressByName',
    description: 'Looks up an Ethereum address by a human-readable name (case-insensitive, fuzzy match allowed). Handles "me", "myself", "my account" to refer to the user\'s own address.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name to look up (e.g., Alice, Bob, me, my account).',
        },
      },
      required: ['name'],
    },
  },
};

// --- Token Address Mapping ---
const TOKEN_ADDRESSES: Record<string, string> = {
  // Use NEXT_PUBLIC_ prefix if these need to be accessible client-side, otherwise standard env var access is fine for API routes
  WETH: process.env.NEXT_PUBLIC_WETH_ADDRESS || process.env.WETH_ADDRESS || '',
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS || process.env.USDC_ADDRESS || '',
};

// Validate required token addresses are present if needed
if (!TOKEN_ADDRESSES.WETH || !TOKEN_ADDRESSES.USDC) {
    console.warn("⚠️ WARNING: WETH_ADDRESS or USDC_ADDRESS not found in environment variables. Some token operations might fail.");
}

// --- ERC20 ABI (minimal) ---
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) public returns (bool)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address account) view returns (uint256)'
];

// --- Helper Functions ---

/**
 * Resolves a potential recipient name (from address book or 'me') or validates an address.
 * Handles possessive forms and self-references.
 * @param recipientOrName Potential name, 'me', possessive, or Ethereum address.
 * @returns The resolved Ethereum address.
 * @throws Error if the recipient is neither a known name, 'me', nor a valid address.
 */
function resolveAddressInput(recipientOrName: string): string {
    let normalized = recipientOrName.trim().toLowerCase();

    // Handle self-references
    if (['me', 'myself', 'my account', 'my address', 'i'].includes(normalized)) {
        console.log(`Resolved self-reference "${recipientOrName}" to address: ${getSelfAddress()}`);
        return getSelfAddress();
    }

    // Remove possessive suffixes and common terms
    normalized = normalized.replace(/[''`\u2019]s\b/i, ''); // Remove 's
    normalized = normalized.replace(/\b(address|account)\b/i, ''); // Remove 'address' or 'account'
    normalized = normalized.trim();


    // Check if it's a name in the address book (case-insensitive)
    const matchedName = Object.keys(addressBook).find(name => name.toLowerCase() === normalized);

    if (matchedName) {
        const resolvedAddress = addressBook[matchedName];
        console.log(`Resolved name "${recipientOrName}" (normalized: "${normalized}") to address: ${resolvedAddress}`);
        if (!ethers.isAddress(resolvedAddress)) {
            throw new Error(`Invalid address configured for name "${matchedName}" in address book: ${resolvedAddress}`);
        }
        return resolvedAddress;
    }

    // Check if it's already a valid address
    if (ethers.isAddress(recipientOrName.trim())) { // Check original input too in case normalization broke it
        return recipientOrName.trim();
    }
     if (ethers.isAddress(normalized)) {
         return normalized;
     }

    // If neither, throw an error
    throw new Error(`Unknown recipient/name or invalid address: ${recipientOrName}`);
}

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = 1 + Math.min(
          matrix[i - 1][j],
          matrix[i][j - 1],
          matrix[i - 1][j - 1]
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

function fuzzyFindName(name: string): string | undefined {
  const lower = name.trim().toLowerCase();

   // Handle self-references first
  if (['me', 'myself', 'my account', 'my address', 'i'].includes(lower)) {
    return 'me'; // Return 'me' identifier, handleLookupAddressByName will resolve it
  }

  let bestMatch: string | undefined = undefined;
  let bestScore = 0; // 0: none, 1: levenshtein<=2, 2: includes, 3: startsWith, 4: exact
  for (const key of Object.keys(addressBook)) {
    const keyLower = key.toLowerCase();
    if (keyLower === lower) return key; // exact match

     const dist = levenshtein(keyLower, lower);
     const includes = keyLower.includes(lower);
     const startsWith = keyLower.startsWith(lower);

    if (startsWith && bestScore < 3) {
        bestMatch = key;
        bestScore = 3;
    } else if (includes && bestScore < 2) {
         bestMatch = key;
         bestScore = 2;
    } else if (dist <= 2 && bestScore < 1) {
        bestMatch = key;
        bestScore = 1;
    }
  }
  return bestMatch;
}

// --- Tool Handler Functions ---

async function handleLookupAddressByName(args: { name: string }) {
  const match = fuzzyFindName(args.name);
  if (!match) {
    return { error: `Could not find a matching name for: ${args.name}` };
  }
  if (match === 'me') {
      try {
         return { name: 'me', address: getSelfAddress() };
      } catch (error: any) {
           return { error: `Failed to get self address: ${error.message}` };
      }
  }
  if (!addressBook[match]) {
       return { error: `Internal error: Matched name "${match}" not found in address book.` };
  }
  return { name: match, address: addressBook[match] };
}


async function handleSendErc20Transfer(args: { recipient: string; token: string; amount: number }) {
    try {
        // Resolve recipient name/address *before* getting wallet to ensure selfAddress is ready if needed
        const resolvedRecipient = resolveAddressInput(args.recipient);
        const currentWallet = getWallet(); // Ensures wallet is initialized

        console.log(`Attempting to transfer ${args.amount} ${args.token} to ${resolvedRecipient} (original recipient: ${args.recipient})...`);

        const tokenSymbol = args.token.toUpperCase();
        const tokenAddress = TOKEN_ADDRESSES[tokenSymbol];
        if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
             throw new Error(`Token address for symbol '${args.token}' not found or invalid. Add it to TOKEN_ADDRESSES in env.`);
        }

        const erc20 = new ethers.Contract(tokenAddress, ERC20_ABI, currentWallet);
        const decimalsBN = await erc20.decimals();
        const decimals = Number(decimalsBN); // Convert BigInt to number

        if (isNaN(decimals)) {
             throw new Error(`Could not retrieve valid decimals for token ${args.token}`);
        }
        const amountInWei = ethers.parseUnits(args.amount.toString(), decimals);

        console.log(`   Token Address: ${tokenAddress}`);
        console.log(`   Decimals: ${decimals}`);
        console.log(`   Amount (Wei): ${amountInWei.toString()}`);

        const tx = await erc20.transfer(resolvedRecipient, amountInWei);
        console.log(`✅ Transaction submitted! Hash: ${tx.hash}`);

        // Don't wait for confirmation in API route - return hash immediately
        // Consider adding a separate endpoint to check transaction status if needed
        return { status: 'ERC20 transfer submitted', txHash: tx.hash, recipientAddress: resolvedRecipient, amount: args.amount, token: args.token };
    } catch (error: any) {
        console.error('❌ Error executing ERC20 transfer:', error);
        return { error: error.message || String(error) };
    }
}

async function handleGetEthBalance(args: { addressOrName: string }) {
    try {
        const resolvedAddress = resolveAddressInput(args.addressOrName);
        const currentProvider = getProvider(); // Ensure provider is initialized
        console.log(`Fetching ETH balance for ${resolvedAddress} (original: ${args.addressOrName})...`);
        const balanceWei = await currentProvider.getBalance(resolvedAddress);
        const balanceEth = ethers.formatEther(balanceWei);
        console.log(`✅ Balance: ${balanceEth} ETH`);
        return { address: resolvedAddress, balance: balanceEth, symbol: 'ETH' };
    } catch (error: any) {
        console.error('❌ Error fetching ETH balance:', error);
        return { error: error.message || String(error) };
    }
}

async function handleGetErc20Balance(args: { addressOrName: string; token: string }) {
    try {
        const resolvedAddress = resolveAddressInput(args.addressOrName);
        const currentProvider = getProvider(); // Read-only, use provider

        console.log(`Fetching ${args.token} balance for ${resolvedAddress} (original: ${args.addressOrName})...`);

        const tokenSymbol = args.token.toUpperCase();
        const tokenAddress = TOKEN_ADDRESSES[tokenSymbol];
        if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
            throw new Error(`Token address for symbol '${args.token}' not found or invalid in env.`);
        }

        const erc20 = new ethers.Contract(tokenAddress, ERC20_ABI, currentProvider);
        const [balanceWei, decimalsBN] = await Promise.all([
            erc20.balanceOf(resolvedAddress),
            erc20.decimals()
        ]);
        const decimals = Number(decimalsBN);

        if (isNaN(decimals)) {
            throw new Error(`Could not retrieve valid decimals for token ${args.token}`);
        }

        const balanceFormatted = ethers.formatUnits(balanceWei, decimals);
        console.log(`✅ Balance: ${balanceFormatted} ${args.token}`);
        return { address: resolvedAddress, balance: balanceFormatted, symbol: tokenSymbol };
    } catch (error: any) {
         console.error('❌ Error fetching ERC20 balance:', error);
         return { error: error.message || String(error) };
    }
}

async function handleSendEthTransfer(args: { recipient: string; amount: number }) {
    try {
        const resolvedRecipient = resolveAddressInput(args.recipient);
        const currentWallet = getWallet(); // Ensure wallet is initialized

        console.log(`Attempting to send ${args.amount} ETH to ${resolvedRecipient} (original recipient: ${args.recipient})...`);

        const amountWei = ethers.parseEther(args.amount.toString());

        const txRequest = {
            to: resolvedRecipient,
            value: amountWei,
        };

        console.log(`   Amount (Wei): ${amountWei.toString()}`);

        const tx = await currentWallet.sendTransaction(txRequest);
        console.log(`✅ Transaction submitted! Hash: ${tx.hash}`);

        // Don't wait for confirmation
        return { status: 'ETH transfer submitted', txHash: tx.hash, recipientAddress: resolvedRecipient, amount: args.amount };
    } catch (error: any) {
         console.error('❌ Error sending ETH:', error);
         return { error: error.message || String(error) };
    }
}

async function handleGetTokenAddress(args: { token: string }) {
    try {
        const tokenSymbol = args.token.toUpperCase();
        console.log(`Looking up address for token symbol: ${tokenSymbol}...`);
        const tokenAddress = TOKEN_ADDRESSES[tokenSymbol];

        if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
            console.warn(`Address not found or invalid for token: ${args.token}`);
            return { error: `Token address for symbol '${args.token}' not found or invalid in env.` };
        }

        console.log(`✅ Address for ${tokenSymbol}: ${tokenAddress}`);
        return { symbol: tokenSymbol, address: tokenAddress };
    } catch (error: any) {
         console.error('❌ Error looking up token address:', error);
         return { error: error.message || String(error) };
    }
}


// --- Refactored Agent Interaction Logic ---

interface AgentTurnResult {
    assistantMessage: OpenAI.Chat.Completions.ChatCompletionMessage;
    toolMessages?: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[];
    performedAction?: boolean; // Indicates if a state-changing action occurred
    error?: string; // Optional error message from the turn
}

/**
 * Executes one turn of interaction with the OpenAI agent.
 */
async function executeAgentTurn(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools: OpenAI.Chat.Completions.ChatCompletionTool[],
    openaiClient: OpenAI // Pass client instance
): Promise<AgentTurnResult> {
    try {
        console.log("🔄 Calling OpenAI...");
        const response = await openaiClient.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo', // Use env var for model
            messages,
            tools,
            tool_choice: 'auto',
        });
        console.log("🔍 OpenAI response received.");

        const choice = response.choices[0];
        const assistantMessage = choice.message;

        if (!assistantMessage.tool_calls) {
            // No tool calls, just a text response
             console.log('💬 Agent:', assistantMessage.content || '(No text content)');
             // Ensure toolMessages is undefined when no tool calls are made
            return { assistantMessage, toolMessages: undefined, performedAction: false };
        }

        // Process tool calls
        // Use the more specific type here
        const toolMessages: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] = [];
        let performedAction = false;
        let turnError: string | undefined = undefined;

        console.log('🛠️ Assistant requested tool calls:');
        // Use Promise.all to run tool calls concurrently (if safe)
        // Note: Be cautious if tools have dependencies on each other within the same turn
        await Promise.all(assistantMessage.tool_calls.map(async (toolCall) => {
            const functionName = toolCall.function.name;
            let functionArgs: any;
            try {
                functionArgs = JSON.parse(toolCall.function.arguments);
            } catch (parseError: any) {
                 const errorMsg = `Failed to parse arguments for ${functionName}: ${parseError.message}`;
                 console.error(`❌ ${errorMsg}`);
                 // Push an error message back for this specific tool call
                 toolMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id, // ID is available here
                    content: JSON.stringify({ error: errorMsg }),
                 });
                 if (turnError) turnError += `; ${errorMsg}`; else turnError = errorMsg;
                 return; // Skip this tool call
            }

            console.log(`   📞 Calling Function: ${functionName}`, functionArgs);

            let toolResult: any;
            try {
                 // Ensure necessary components are initialized before calling handlers
                 getProvider();
                 if (['sendErc20Transfer', 'sendEthTransfer'].includes(functionName)) {
                     getWallet(); // Ensure wallet is ready for signing
                 }

                switch (functionName) {
                    case 'lookupAddressByName':
                        toolResult = await handleLookupAddressByName(functionArgs);
                        break;
                    case 'sendERC20Transfer':
                        toolResult = await handleSendErc20Transfer(functionArgs);
                        if (!toolResult.error) performedAction = true;
                        break;
                    case 'getEthBalance':
                        toolResult = await handleGetEthBalance(functionArgs);
                        break;
                    case 'getErc20Balance':
                        toolResult = await handleGetErc20Balance(functionArgs);
                        break;
                    case 'sendEthTransfer':
                        toolResult = await handleSendEthTransfer(functionArgs);
                         if (!toolResult.error) performedAction = true;
                        break;
                    case 'getTokenAddress':
                        toolResult = await handleGetTokenAddress(functionArgs);
                        break;
                    default:
                        console.warn(`⚠️ Unknown function call requested: ${functionName}`);
                        toolResult = { error: `Unknown function: ${functionName}` };
                }

                 if (toolResult && toolResult.error) {
                     const toolErrorMsg = `Error executing tool ${functionName}: ${toolResult.error}`;
                     console.error(`❌ ${toolErrorMsg}`);
                     if (turnError) turnError += `; ${toolErrorMsg}`; else turnError = toolErrorMsg;
                 } else {
                      console.log(`✅ Tool ${functionName} executed successfully.`);
                 }

            } catch (error: any) {
                const errorMessage = `Internal error executing tool ${functionName}: ${error.message}`;
                console.error(`❌ Unexpected error calling handler for ${functionName}:`, error);
                toolResult = { error: errorMessage };
                if (turnError) turnError += `; ${errorMessage}`; else turnError = errorMessage;
            }

            const resultContent = JSON.stringify(toolResult ?? { status: 'Tool executed, no specific data returned.' });
            // Push the result, conforming to ChatCompletionToolMessageParam
            toolMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id, // ID is available here
                content: resultContent,
            });
            console.log(`   📦 Tool Result (${functionName}): ${resultContent.substring(0, 200)}...`); // Log truncated result
        })); // End Promise.all map

        // Sort tool messages by tool_call_id (should work now without casting)
        toolMessages.sort((a, b) => (a.tool_call_id > b.tool_call_id) ? 1 : -1);

        return { assistantMessage, toolMessages, performedAction, error: turnError };

    } catch (error: any) {
        console.error('❌ Error calling OpenAI API:', error);
        const errorMessage = `Failed to get response from OpenAI: ${error.message}`;
        // Return an error structure that can be handled by the calling loop
        return {
             assistantMessage: { role: 'assistant', content: `Error: ${errorMessage}` } as OpenAI.Chat.Completions.ChatCompletionMessage,
             error: errorMessage,
             // Ensure toolMessages is undefined on API error
             toolMessages: undefined,
             performedAction: false,
        };
    }
}


// --- Main Processing Function for API ---

/**
 * Processes a transcribed text input within the context of an ongoing conversation.
 * Handles initialization, agent turns, and tool calls.
 *
 * @param transcribedText The new text input from the user.
 * @param currentMessages The existing conversation history. Will be mutated.
 * @returns The updated conversation history array.
 * @throws If initialization fails or a critical error occurs during processing.
 */
export async function processTranscribedTextInput(
    transcribedText: string,
    currentMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
    console.log(`Processing transcribed text: "${transcribedText}"`);

    // Ensure clients/wallet are initialized safely
    const openaiClient = getOpenAIClient();
    const currentSelfAddress = getSelfAddress(); // Ensures wallet/provider initialized and gets address

    // Define tools available
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
        lookupAddressByNameSchema,
        sendErc20TransferSchema,
        getEthBalanceSchema,
        getErc20BalanceSchema,
        sendEthTransferSchema,
        getTokenAddressSchema,
    ];

    // Add system prompt if not present or update self-address if needed
    const systemPromptContent = `
You are an assistant that helps with Ethereum transactions.
Your Ethereum address is: ${currentSelfAddress}. When the user refers to "me", "myself", "my", or "mine" in the context of an address, you MUST use this address.

**CRITICAL INSTRUCTION:** If a user provides a name (e.g., 'Alice', 'Bob', 'Eve') OR uses "me"/"my account" etc. instead of a direct Ethereum address for a recipient or balance check, you MUST use the \`lookupAddressByName\` tool FIRST to resolve the name/reference to an address. **DO NOT attempt to call the name itself as a function.** ONLY AFTER you have successfully received the address from \`lookupAddressByName\` should you call other tools like \`sendEthTransfer\`, \`sendErc20Transfer\`, \`getEthBalance\`, or \`getErc20Balance\` using that resolved address.

**Choosing the Right Transfer Function - VERY IMPORTANT:**
*   Use \`sendEthTransfer\` ONLY for sending **native ETH**. **You MUST NOT use \`sendEthTransfer\` for WETH or other ERC20 tokens.**
*   Use \`sendErc20Transfer\` for sending **ERC20 tokens**, such as **WETH** or **USDC**. If the user asks to send WETH, you MUST use \`sendErc20Transfer\` and include the \`token\` parameter.

Use the \`getTokenAddress\` tool if you need the contract address for a specific token symbol BEFORE attempting an ERC20 transfer or balance check if the address is not already known.

**Handling Sequences:** If a request involves multiple steps (e.g., check balances, perform a transfer, then check balances again), execute each step completely and sequentially. Use the results from one step before starting the next.

**Reporting Results:** When reporting balances before and after a transaction, clearly state the initial balances for all relevant parties, then describe the action taken (e.g., transfer submitted), and finally state the updated balances clearly differentiating them from the initial ones. **Make sure your final text response to the user includes the results of the *last* step requested in the sequence.**

You SHOULD wait for transaction confirmation and report the transaction hash and its final status after submitting the transaction. Assume the RPC connection is to the correct network.
Be concise but clear in your responses.`;

    if (currentMessages.length === 0 || currentMessages[0].role !== 'system') {
        currentMessages.unshift({ role: 'system', content: systemPromptContent });
    } else {
        // Optionally update system prompt if address could change (e.g., different users)
        // For simplicity, we assume the system prompt with the address is static per session
        // currentMessages[0].content = systemPromptContent; // Uncomment to force update
    }


    // Add the new transcribed text as a user message
    // currentMessages.push({ role: 'user', content: transcribedText });

    // Loop for agent turns and tool calls
    while (true) {
        const turnResult = await executeAgentTurn(currentMessages, tools, openaiClient);

        // Add assistant's response (potentially with tool call requests) to history
        // Ensure assistantMessage exists, even on error, to avoid breaking history
         if (turnResult.assistantMessage) {
             currentMessages.push(turnResult.assistantMessage);
         } else {
             console.error("Agent turn result missing assistant message!");
             // Handle this case, maybe push an error message?
             currentMessages.push({role: "assistant", content: `Internal error: Agent failed to produce a message. Error: ${turnResult.error}`});
             break; // Exit loop on critical failure
         }


        if (turnResult.error && !turnResult.toolMessages?.length) {
             console.error("Halting processing due to error during agent turn (before tool execution):", turnResult.error);
             // The error message is already in the assistant message from executeAgentTurn error handling
             break;
        }

        if (turnResult.toolMessages && turnResult.toolMessages.length > 0) {
            // Add tool results to history and continue the loop for the agent to process them
            currentMessages.push(...turnResult.toolMessages);
            console.log('🔌 Feeding tool results back to agent...');
            // Loop continues to call executeAgentTurn again
        } else {
            // No tool calls in the response, the conversation turn for this input is complete.
            console.log("✅ Agent finished processing this input.");
            break; // Exit the loop
        }
    }

    console.log("--- Finished processing transcribed text input ---");
    return currentMessages; // Return the final state of the conversation history
} 