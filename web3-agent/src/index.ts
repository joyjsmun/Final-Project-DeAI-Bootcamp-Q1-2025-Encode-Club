import OpenAI from 'openai';
import { config } from 'dotenv';
import { ethers } from 'ethers';
import { addressBook } from './addressBook';
import readline from 'readline';

// Load environment variables from .env file
config();

// --- Configuration ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
let PRIVATE_KEY = process.env.PRIVATE_KEY;
// Default to local Hardhat node, allow override via .env
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545/';

// --- Validate Configuration ---
if (!OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY in .env file');
}
if (!PRIVATE_KEY) {
  console.warn("⚠️ WARNING: Missing PRIVATE_KEY in .env file.");
  const newWallet = ethers.Wallet.createRandom();
  PRIVATE_KEY = newWallet.privateKey;
  console.log(`🔑 Generated a new temporary private key.`);
  console.log(`   Address: ${newWallet.address}`);
  console.log(`   🛑 IMPORTANT: This key is ephemeral. Fund this address with ETH and tokens for testing.`);
  console.log(`      You MUST add this private key to your .env file to reuse the same address later.`);
  // PRIVATE_KEY is now known to be a string 
}

// Ensure private key starts with 0x and is valid
let formattedPrivateKey = PRIVATE_KEY as string;
if (!formattedPrivateKey.startsWith('0x')) {
    formattedPrivateKey = '0x' + formattedPrivateKey;
}
if (formattedPrivateKey.length !== 66) { // 0x + 64 hex characters
    throw new Error('Invalid private key length in .env. Ensure it is a 64-character hex string, optionally prefixed with 0x.');
}

// --- Initialize ethers.js Wallet and Provider ---
// Moved initialization earlier to be available for all handlers
let provider: ethers.JsonRpcProvider;
let wallet: ethers.Wallet;
try {
  console.log('Initializing ethers.js Provider and Wallet...');
  provider = new ethers.JsonRpcProvider(RPC_URL);
  wallet = new ethers.Wallet(formattedPrivateKey, provider);
  console.log(`Wallet Address: ${wallet.address}`);
  console.log('ethers.js initialized successfully.');
} catch (error) {
  console.error('❌ Error initializing ethers.js:', error);
  process.exit(1); // Exit if essential components fail to initialize
}

// --- OpenAI Function Schemas ---

// 1. Send ERC20 Transfer Schema
const sendErc20TransferSchema: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'sendERC20Transfer',
    description: 'Initiates an ERC20 token transfer on the blockchain.',
    parameters: {
      type: 'object',
      properties: {
        recipient: {
          type: 'string',
          description: 'The Ethereum address (e.g., 0x123...abc) of the recipient. **IMPORTANT: If you are given a name (like \'Alice\', \'Bob\', \'me\'), you MUST use the `lookupAddressByName` tool first to get the address before calling this tool.**',
        },
        token: {
          type: 'string',
          description: 'The symbol of the ERC20 token to transfer (e.g., USDC, WETH)',
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

// 2. Get ETH Balance Schema
const getEthBalanceSchema: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: 'function',
    function: {
        name: 'getEthBalance',
        description: 'Gets the native ETH balance of a given Ethereum address.',
        parameters: {
            type: 'object',
            properties: {
                address: {
                    type: 'string',
                    description: 'The Ethereum address (e.g., 0x123...abc) to check the balance of. **IMPORTANT: If you are given a name (like \'Alice\', \'Bob\', \'me\'), you MUST use the `lookupAddressByName` tool first to get the address before calling this tool.**',
                },
            },
            required: ['address'],
        },
    },
};

// 3. Get ERC20 Token Balance Schema
const getErc20BalanceSchema: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: 'function',
    function: {
        name: 'getErc20Balance',
        description: 'Gets the balance of a specific ERC20 token for a given Ethereum address.',
        parameters: {
            type: 'object',
            properties: {
                address: {
                    type: 'string',
                    description: 'The Ethereum address (e.g., 0x123...abc) to check the balance of. **IMPORTANT: If you are given a name (like \'Alice\', \'Bob\', \'me\'), you MUST use the `lookupAddressByName` tool first to get the address before calling this tool.**',
                },
                token: {
                    type: 'string',
                    description: 'The symbol of the ERC20 token (e.g., USDC, WETH)',
                },
            },
            required: ['address', 'token'],
        },
    },
};

// 4. Send ETH Transfer Schema
const sendEthTransferSchema: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: 'function',
    function: {
        name: 'sendEthTransfer',
        description: 'Initiates a transfer of native ETH to another Ethereum address.',
        parameters: {
            type: 'object',
            properties: {
                recipient: {
                    type: 'string',
                    description: 'The Ethereum address (e.g., 0x123...abc) of the recipient. **IMPORTANT: If you are given a name (like \'Alice\', \'Bob\', \'me\'), you MUST use the `lookupAddressByName` tool first to get the address before calling this tool.**',
                },
                amount: {
                    type: 'number',
                    description: 'The amount of ETH to send.',
                },
            },
            required: ['recipient', 'amount'],
        },
    },
};

// 5. Get Token Address Schema
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

// 0. Lookup Address By Name Schema
const lookupAddressByNameSchema: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'lookupAddressByName',
    description: 'Looks up an Ethereum address by a human-readable name (case-insensitive, fuzzy match allowed).',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name to look up (e.g., Alice, Bob, etc.)',
        },
      },
      required: ['name'],
    },
  },
};

// --- Token Address Mapping ---
const TOKEN_ADDRESSES: Record<string, string> = {
  // Ensure addresses are populated from .env or default to empty strings
  WETH: process.env.WETH_ADDRESS || '',
  USDC: process.env.USDC_ADDRESS || '',
  // Add more tokens as needed (Symbol.toUpperCase() -> Address)
};
// Validate required token addresses are present if needed for core functionality
if (!TOKEN_ADDRESSES.WETH || !TOKEN_ADDRESSES.USDC) {
    console.warn("⚠️ WARNING: WETH_ADDRESS or USDC_ADDRESS not found in .env. Some token operations might fail.");
}

// --- ERC20 ABI (minimal) ---
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) public returns (bool)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address account) view returns (uint256)' // Added balanceOf
];

// --- Helper Functions ---

/**
 * Resolves a potential recipient name (from address book) or validates an address.
 * Handles possessive forms (e.g., "Alice's").
 * @param recipient Potential name or Ethereum address.
 * @returns The resolved Ethereum address.
 * @throws Error if the recipient is neither a known name nor a valid address.
 */
function resolveRecipient(recipient: string): string {
    // Remove possessive suffixes (e.g., "'s", "'s")
    let normalized = recipient.trim();
    normalized = normalized.replace(/[''`\u2019]s\b/i, ''); // Remove possessive 's
    normalized = normalized.replace(/\baddress$/i, ''); // Remove trailing 'address' if present
    normalized = normalized.trim();

    // Check if it's a name in the address book (case-insensitive)
    const lowerRecipient = normalized.toLowerCase();
    const matchedName = Object.keys(addressBook).find(name => name.toLowerCase() === lowerRecipient);

    if (matchedName) {
        const resolvedAddress = addressBook[matchedName];
        console.log(`Resolved name "${recipient}" (normalized: "${normalized}") to address: ${resolvedAddress}`);
        if (!ethers.isAddress(resolvedAddress)) {
            throw new Error(`Invalid address configured for name "${matchedName}" in address book: ${resolvedAddress}`);
        }
        return resolvedAddress;
    }

    // Check if it's already a valid address
    if (ethers.isAddress(normalized)) {
        return normalized;
    }

    // If neither, throw an error
    throw new Error(`Unknown recipient name or invalid address: ${recipient}`);
}

// --- Tool Handler Functions ---

// 1. Handle Send ERC20 Transfer
async function handleSendErc20Transfer(args: { recipient: string; token: string; amount: number }) {
    try {
        // Resolve recipient name/address first
        const resolvedRecipient = resolveRecipient(args.recipient);

        console.log(`Attempting to transfer ${args.amount} ${args.token} to ${resolvedRecipient} (original recipient: ${args.recipient})...`);

        const tokenSymbol = args.token.toUpperCase();
        const tokenAddress = TOKEN_ADDRESSES[tokenSymbol];
        if (!tokenAddress) {
            throw new Error(`Token address for symbol '${args.token}' not found. Add it to TOKEN_ADDRESSES and the .env file.`);
        }
        if (!ethers.isAddress(tokenAddress)) {
             throw new Error(`Invalid address configured for token '${args.token}': ${tokenAddress}`);
        }
        // Validation for resolvedRecipient already happened in resolveRecipient

        const erc20 = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
        const decimals = await erc20.decimals();
        // Catch potential decimals error
        if (typeof decimals !== 'number' && typeof decimals !== 'bigint') {
             throw new Error(`Could not retrieve decimals for token ${args.token}`);
        }
        const amountInWei = ethers.parseUnits(args.amount.toString(), Number(decimals));

        console.log(`   Token Address: ${tokenAddress}`);
        console.log(`   Decimals: ${decimals}`);
        console.log(`   Amount (Wei): ${amountInWei.toString()}`);

        const tx = await erc20.transfer(resolvedRecipient, amountInWei); // Use resolvedRecipient
        console.log(`✅ Transaction submitted!`);
        console.log(`   Transaction Hash: ${tx.hash}`);

        console.log('Waiting for transaction confirmation (1 block)...');
        const receipt = await tx.wait(1); // Wait for 1 confirmation
        console.log(`🎉 Transaction confirmed!`);
        console.log(`   Block Number: ${receipt?.blockNumber}`);
        // Add block explorer link (replace with appropriate one if not mainnet)
        console.log(`   Etherscan: https://etherscan.io/tx/${tx.hash}`); // TODO: Make dynamic based on network
        return { status: 'ERC20 transfer attempted', txHash: tx.hash };
    } catch (error) {
        console.error('❌ Error executing ERC20 transfer:', error instanceof Error ? error.message : error);
        return { error: error instanceof Error ? error.message : String(error) };
    }
}

// 2. Handle Get ETH Balance
async function handleGetEthBalance(args: { address: string }) {
    try {
        // Resolve address if it's a name
        const resolvedAddress = resolveRecipient(args.address);
        console.log(`Fetching ETH balance for ${resolvedAddress} (original: ${args.address})...`);
        const balanceWei = await provider.getBalance(resolvedAddress);
        const balanceEth = ethers.formatEther(balanceWei);
        console.log(`✅ Balance: ${balanceEth} ETH`);
        return { address: resolvedAddress, balance: balanceEth, symbol: 'ETH' };
    } catch (error) {
        console.error('❌ Error fetching ETH balance:', error instanceof Error ? error.message : error);
        return { error: error instanceof Error ? error.message : String(error) };
    }
}

// 3. Handle Get ERC20 Token Balance
async function handleGetErc20Balance(args: { address: string; token: string }) {
    try {
        // Resolve address if it's a name
        const resolvedAddress = resolveRecipient(args.address);
        console.log(`Fetching ${args.token} balance for ${resolvedAddress} (original: ${args.address})...`);

        const tokenSymbol = args.token.toUpperCase();
        const tokenAddress = TOKEN_ADDRESSES[tokenSymbol];
        if (!tokenAddress) {
             throw new Error(`Token address for symbol '${args.token}' not found. Add it to TOKEN_ADDRESSES and the .env file.`);
        }
        if (!ethers.isAddress(tokenAddress)) {
             throw new Error(`Invalid address configured for token '${args.token}': ${tokenAddress}`);
        }

        const erc20 = new ethers.Contract(tokenAddress, ERC20_ABI, provider); // Use provider for read-only
        const [balanceWei, decimals] = await Promise.all([
            erc20.balanceOf(resolvedAddress),
            erc20.decimals()
        ]);

         // Catch potential decimals error
         if (typeof decimals !== 'number' && typeof decimals !== 'bigint') {
             throw new Error(`Could not retrieve decimals for token ${args.token}`);
         }

        const balanceFormatted = ethers.formatUnits(balanceWei, Number(decimals));
        console.log(`✅ Balance: ${balanceFormatted} ${args.token}`);
        return { address: resolvedAddress, balance: balanceFormatted, symbol: tokenSymbol };
    } catch (error) {
         console.error('❌ Error fetching ERC20 balance:', error instanceof Error ? error.message : error);
         return { error: error instanceof Error ? error.message : String(error) };
    }
}

// 4. Handle Send ETH Transfer
async function handleSendEthTransfer(args: { recipient: string; amount: number }) {
    try {
         // Resolve recipient name/address first
         const resolvedRecipient = resolveRecipient(args.recipient);

        console.log(`Attempting to send ${args.amount} ETH to ${resolvedRecipient} (original recipient: ${args.recipient})...`);

        // Validation for resolvedRecipient already happened in resolveRecipient

        const amountWei = ethers.parseEther(args.amount.toString());

        const txRequest = {
            to: resolvedRecipient, // Use resolvedRecipient
            value: amountWei,
        };

        console.log(`   Amount (Wei): ${amountWei.toString()}`);

        const tx = await wallet.sendTransaction(txRequest);
        console.log(`✅ Transaction submitted!`);
        console.log(`   Transaction Hash: ${tx.hash}`);

        console.log('Waiting for transaction confirmation (1 block)...');
        const receipt = await tx.wait(1); // Wait for 1 confirmation
        console.log(`🎉 Transaction confirmed!`);
        console.log(`   Block Number: ${receipt?.blockNumber}`);
        // Add block explorer link (replace with appropriate one if not mainnet)
        console.log(`   Etherscan: https://etherscan.io/tx/${tx.hash}`); // TODO: Make dynamic based on network
        return { status: 'ETH transfer attempted', txHash: tx.hash };
    } catch (error) {
         console.error('❌ Error sending ETH:', error instanceof Error ? error.message : error);
         return { error: error instanceof Error ? error.message : String(error) };
    }
}

// 5. Handle Get Token Address
async function handleGetTokenAddress(args: { token: string }) {
    try {
        const tokenSymbol = args.token.toUpperCase();
        console.log(`Looking up address for token symbol: ${tokenSymbol}...`);
        const tokenAddress = TOKEN_ADDRESSES[tokenSymbol];

        if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
            console.warn(`Address not found or invalid for token: ${args.token}`);
            // Return an error structure consistent with other handlers
            return { error: `Token address for symbol '${args.token}' not found or invalid.` };
        }

        console.log(`✅ Address for ${tokenSymbol}: ${tokenAddress}`);
        return { symbol: tokenSymbol, address: tokenAddress };
    } catch (error) {
         console.error('❌ Error looking up token address:', error instanceof Error ? error.message : error);
         // Return an error structure consistent with other handlers
         return { error: error instanceof Error ? error.message : String(error) };
    }
}

// --- Address Book Lookup Handler ---
function fuzzyFindName(name: string): string | undefined {
  // Case-insensitive exact match
  const lower = name.trim().toLowerCase();
  let bestMatch: string | undefined = undefined;
  let bestScore = 0;
  for (const key of Object.keys(addressBook)) {
    const keyLower = key.toLowerCase();
    if (keyLower === lower) return key; // exact
    // Fuzzy: startsWith, includes, Levenshtein distance <= 2
    if (keyLower.startsWith(lower) || keyLower.includes(lower)) {
      if (!bestMatch || keyLower.startsWith(lower)) {
        bestMatch = key;
        bestScore = 2;
      }
    } else {
      // Levenshtein distance
      const dist = levenshtein(keyLower, lower);
      if (dist <= 2 && (!bestMatch || bestScore < 1)) {
        bestMatch = key;
        bestScore = 1;
      }
    }
  }
  return bestMatch;
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

async function handleLookupAddressByName(args: { name: string }) {
  const match = fuzzyFindName(args.name);
  if (!match) {
    return { error: `Unknown name: ${args.name}` };
  }
  return { name: match, address: addressBook[match] };
}

// --- Refactored Agent Interaction Logic ---

interface AgentTurnResult {
    assistantMessage: OpenAI.Chat.Completions.ChatCompletionMessage;
    toolMessages?: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    performedAction?: boolean; // Indicates if a state-changing action (e.g., transfer) occurred
    error?: string; // Optional error message from the turn
}

/**
 * Executes one turn of interaction with the OpenAI agent.
 * Sends current messages, processes response (text or tool calls), executes tools if needed.
 * @param messages The current conversation history.
 * @param tools The available tools for the agent.
 * @param openai The OpenAI client instance.
 * @returns An object containing the assistant's message, any tool messages, and a flag indicating if an action was performed.
 */
async function executeAgentTurn(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools: OpenAI.Chat.Completions.ChatCompletionTool[],
    openai: OpenAI
): Promise<AgentTurnResult> {
    try {
        console.log("🔄 Calling OpenAI..."); // Added log
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini', // Or your preferred model
            messages,
            tools,
            tool_choice: 'auto',
        });
        console.log("🔍 OpenAI response received."); // Added log

        const choice = response.choices[0];
        const assistantMessage = choice.message;

        if (!assistantMessage.tool_calls) {
            // No tool calls, just a text response (or empty response)
            if (assistantMessage.content) {
                console.log('💬 Agent:', assistantMessage.content); // Changed log prefix
            } else {
                 console.log(' Agent: (No response or finished)'); // Changed log prefix
            }
            return { assistantMessage };
        }

        // Process tool calls
        const toolMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        let performedAction = false;
        let turnError: string | undefined = undefined;

        console.log('🛠️ Assistant requested tool calls:');
        for (const toolCall of assistantMessage.tool_calls) {
            const functionName = toolCall.function.name;
            let functionArgs: any;
            try {
                functionArgs = JSON.parse(toolCall.function.arguments);
            } catch (parseError) {
                 const errorMsg = `Failed to parse arguments for ${functionName}: ${parseError instanceof Error ? parseError.message : String(parseError)}`;
                 console.error(`❌ ${errorMsg}`);
                 toolMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify({ error: errorMsg }),
                 });
                 if (turnError) turnError += `; ${errorMsg}`; else turnError = errorMsg;
                 continue; // Skip to next tool call if args are invalid
            }

            console.log(`   📞 Calling Function: ${functionName}`); // Changed log
            console.log('     Arguments:', functionArgs);

            let toolResult: any;
            try {
                switch (functionName) {
                    case 'lookupAddressByName':
                        toolResult = await handleLookupAddressByName(functionArgs);
                        // Lookups don't count as the primary "action"
                        break;
                    case 'sendERC20Transfer':
                        toolResult = await handleSendErc20Transfer(functionArgs);
                        performedAction = true; // This is a state-changing action
                        break;
                    case 'getEthBalance':
                        toolResult = await handleGetEthBalance(functionArgs);
                        // Balance checks could optionally be considered actions if needed
                        break;
                    case 'getErc20Balance':
                        toolResult = await handleGetErc20Balance(functionArgs);
                        break;
                    case 'sendEthTransfer':
                        toolResult = await handleSendEthTransfer(functionArgs);
                        performedAction = true; // State-changing action
                        break;
                    case 'getTokenAddress':
                        toolResult = await handleGetTokenAddress(functionArgs);
                        break;
                    default:
                        console.warn(`⚠️ Unknown function call requested: ${functionName}`);
                        toolResult = { error: `Unknown function: ${functionName}` };
                        // Decide if unknown function halts (might set performedAction = true or throw)
                }

                // Log errors from tool execution if any, and add to turnError
                 if (toolResult && toolResult.error) {
                     const toolErrorMsg = `Error executing tool ${functionName}: ${toolResult.error}`;
                     console.error(`❌ ${toolErrorMsg}`); // Log error clearly
                     if (turnError) turnError += `; ${toolErrorMsg}`; else turnError = toolErrorMsg;
                 } else {
                     // Log success slightly differently for clarity
                     if(functionName === 'lookupAddressByName' && !toolResult.error){
                         console.log(`✅ Tool ${functionName} Result: Found ${toolResult.name} -> ${toolResult.address}`);
                     } else if (functionName === 'getTokenAddress' && !toolResult.error){
                          console.log(`✅ Tool ${functionName} Result: ${toolResult.symbol} -> ${toolResult.address}`);
                     } else if (!toolResult.error) {
                         console.log(`✅ Tool ${functionName} executed (see specific handler logs for details). Result keys:`, Object.keys(toolResult));
                     }
                 }

            } catch (error) {
                const errorMessage = `Internal error executing tool ${functionName}: ${error instanceof Error ? error.message : String(error)}`;
                console.error(`❌ Unexpected error calling handler for ${functionName}:`, error);
                toolResult = { error: errorMessage };
                if (turnError) turnError += `; ${errorMessage}`; else turnError = errorMessage;
            }

            // Ensure content is always a string, even if toolResult is undefined/null
            const resultContent = JSON.stringify(toolResult ?? { status: 'Tool executed, no data returned.' });
            toolMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: resultContent,
            });
            console.log(`   📦 Tool Result (${functionName}): ${resultContent}`); // Log result being sent back
        }

        return { assistantMessage, toolMessages, performedAction, error: turnError };

    } catch (error) {
        console.error('❌ Error calling OpenAI API:', error);
        // Return an error structure that can be handled by the calling loop
        const errorMessage = `Failed to get response from OpenAI: ${error instanceof Error ? error.message : String(error)}`;
        return {
             // Provide a dummy assistant message to avoid breaking message structure
             assistantMessage: { role: 'assistant', content: `Error: ${errorMessage}` } as OpenAI.Chat.Completions.ChatCompletionMessage,
             error: errorMessage,
        };
    }
}

// --- Main Execution Function (Tool Chaining - Refactored) ---
async function processTransactionInstruction(instruction: string) {
  console.log(`========================================`);
  console.log(`Processing instruction: "${instruction}"`);
  console.log(`========================================`);

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const selfAddress = wallet.address;
  const systemPrompt = `
You are an assistant that helps with Ethereum transactions.
Whenever the user refers to "me", "myself", or "my" in the context of an address, you MUST use the address: ${selfAddress}.

**CRITICAL INSTRUCTION:** If a user provides a name (e.g., 'Alice', 'Bob', 'Eve') instead of a direct Ethereum address for a recipient or balance check, you MUST use the \`lookupAddressByName\` tool FIRST to resolve the name to an address. ONLY AFTER you have successfully received the address from \`lookupAddressByName\` should you call other tools like \`sendEthTransfer\`, \`sendErc20Transfer\`, \`getEthBalance\`, or \`getErc20Balance\` using that resolved address.

Use the \`getTokenAddress\` tool if you need the contract address for a specific token symbol BEFORE attempting an ERC20 transfer or balance check if the address is not already known.
`;
  const tools = [ // Define tools available for this function
      lookupAddressByNameSchema,
      sendErc20TransferSchema,
      getEthBalanceSchema,
      getErc20BalanceSchema,
      sendEthTransferSchema,
      getTokenAddressSchema,
  ];
  let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: instruction },
  ];

  while (true) {
    const turnResult = await executeAgentTurn(messages, tools, openai);

    // Add the assistant's response (potentially with tool call requests) to history
    messages.push(turnResult.assistantMessage);

    if (turnResult.error && !turnResult.toolMessages?.length) {
         console.error("Halting due to error during agent turn (before tool execution):", turnResult.error);
         break; // Stop processing if a critical error occurred before tool execution
    }

    if (turnResult.toolMessages && turnResult.toolMessages.length > 0) {
      // Add tool results to history and continue the loop for the agent to process them
      messages.push(...turnResult.toolMessages);
       console.log('🔌 Feeding tool results back to agent...');
       if (turnResult.performedAction) {
           console.log('✅ Action performed, concluding instruction processing.');
           break; // Exit if a state-changing action was performed
       }
        // Continue loop if only lookups or non-action tools were called
    } else {
      // No tool calls in the response, the conversation turn is complete from the agent's side.
       console.log("✅ Agent finished processing this instruction.");
      break; // Exit the loop
    }
  }
  // Final log message after loop finishes or breaks
  console.log(`========================================`);
  console.log(`Finished processing instruction: "${instruction}"`);
  console.log(`========================================`);
}

// --- Example Usage ---
async function runExamples() {
    // Make sure the recipient address is valid and the wallet has funds/tokens on the target network (RPC_URL)
    // const recipientAddress = process.env.RECIPIENT_ADDRESS || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"; // Example direct address
    const selfAddress = wallet.address; // Use the address derived from the private key

    console.log(`--- Running Examples ---`);
    console.log(`Using wallet address: ${selfAddress}`);
    // console.log(`Using recipient address: ${recipientAddress}`); // Removed as we use names/direct address
    console.log(`Connected to RPC: ${RPC_URL}`);
    console.log(`---`);

    // Example 1: Send ERC20 using a name
    await processTransactionInstruction(`Send 0.01 WETH to Bob`);

    // Example 2: Send ETH using a name
    await processTransactionInstruction(`Send 0.005 ETH to Charlie`);

    // Example 3: Get ETH Balance (Self)
    await processTransactionInstruction(`What's my ETH balance? My address is ${selfAddress}`);

     // Example 4: Get ETH Balance (Other - using name)
    await processTransactionInstruction(`Check the ETH balance of David`);

    // Example 5: Get ERC20 Balance (Self)
    await processTransactionInstruction(`How much USDC do I have at ${selfAddress}?`);

    // Example 6: Get ERC20 Balance (Other - using name)
    await processTransactionInstruction(`Show the WETH balance for Eve`);

    // Example 7: Send ETH using a direct address (should still work)
    await processTransactionInstruction(`Send 0.001 ETH to 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65`); // David's address directly

    // Example 8: Attempt transfer to unknown name (should fail)
    await processTransactionInstruction(`Send 0.1 WETH to UnknownPerson`);

    // --- NEW EXAMPLES FOR SELF-REFERENCE ---
    console.log("--- Testing Self-Reference --- ");

    // Example 9: Get own ETH balance using "my"
    await processTransactionInstruction("What is my ETH balance?");

    // Example 10: Get own USDC balance using "my"
    await processTransactionInstruction("How much USDC is in my account?");

    // Example 11: Send ETH to self using "myself"
    await processTransactionInstruction("Send 0.001 ETH to myself");

    // Example 12: Send WETH to self using "me"
    await processTransactionInstruction("Send 0.002 WETH to me");

    console.log("--- Self-Reference Tests Complete ---"); 

    // --- NEW EXAMPLE FOR GET TOKEN ADDRESS ---
    console.log("--- Testing Get Token Address ---");
    await processTransactionInstruction("What is the contract address for the USDC token?");
    await processTransactionInstruction("Get address for WETH");
    await processTransactionInstruction("find the token address for foobar"); // Should fail
    console.log("--- Get Token Address Test Complete ---");
    // --- END NEW EXAMPLE ---

    // Example 13: Non-tool call (or potentially misunderstood instruction)
    // await processTransactionInstruction("What is the weather like?"); // Uncomment to test non-tool responses

    console.log(`--- Examples Complete ---`);

}

// --- Interactive Terminal Chat (Refactored) ---
async function interactiveChat() {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const selfAddress = wallet.address;
    const systemPrompt = `
You are an assistant that helps with Ethereum transactions.
Whenever the user refers to "me", "myself", or "my" in the context of an address, you MUST use the address: ${selfAddress}.

**CRITICAL INSTRUCTION:** If a user provides a name (e.g., 'Alice', 'Bob', 'Eve') instead of a direct Ethereum address for a recipient or balance check, you MUST use the \`lookupAddressByName\` tool FIRST to resolve the name to an address. ONLY AFTER you have successfully received the address from \`lookupAddressByName\` should you call other tools like \`sendEthTransfer\`, \`sendErc20Transfer\`, \`getEthBalance\`, or \`getErc20Balance\` using that resolved address.

Use the \`getTokenAddress\` tool if you need the contract address for a specific token symbol BEFORE attempting an ERC20 transfer or balance check if the address is not already known.
`;
    let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
    ];
    const tools = [ // Tools available in interactive mode
        lookupAddressByNameSchema,
        sendErc20TransferSchema,
        getEthBalanceSchema,
        getErc20BalanceSchema,
        sendEthTransferSchema,
        getTokenAddressSchema,
    ];
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '\nYou: ' // Prompt for user input
    });
    console.log('--- Interactive Ethereum Chat ---');
    console.log('Type your prompt and press Enter. Press Ctrl+C to exit.');
    rl.prompt(); // Show initial prompt

    rl.on('SIGINT', () => {
        console.log('\nExiting chat.');
        rl.close();
        process.exit(0);
    });

    for await (const line of rl) {
        const input = line.trim();
        if (!input) {
            rl.prompt(); // Re-prompt if empty line entered
            continue;
        }
        messages.push({ role: 'user', content: input }); // Add user input to history

        // Process the user input, allowing for multiple agent/tool turns if needed
        while (true) {
             console.log("Processing your request..."); // Indicate processing start
            const turnResult = await executeAgentTurn(messages, tools, openai);

            // Add assistant message (requesting tools or final response)
            messages.push(turnResult.assistantMessage);

            if (turnResult.error && !turnResult.toolMessages?.length) {
                 console.error("Agent turn failed before tool execution:", turnResult.error);
                 // Break the inner loop, agent failed before acting
                 break;
            }

            if (turnResult.toolMessages && turnResult.toolMessages.length > 0) {
                // Add tool results and let the agent process them in the next iteration
                messages.push(...turnResult.toolMessages);
                console.log(" Agent is processing tool results..."); // Inform user
                // The loop continues automatically to call executeAgentTurn again
                 continue;
            } else {
                // No more tool calls needed for this user input.
                 console.log(" Agent finished responding to this request.");
                 break; // Break the inner while loop to wait for next user input
            }
        }
        // Inner loop finished, prompt for the next user input
        rl.prompt();
    }
}

// --- HOW TO USE WITH SPEECH-TO-TEXT ---

/**
 * Example of how you would integrate your transcribed text.
 * This function encapsulates processing a single text input within an ongoing conversation.
 *
 * @param transcribedText The text obtained from your speech-to-text engine.
 * @param currentMessages The current conversation history array. It will be modified in place.
 * @returns The updated conversation history array.
 */
async function processTranscribedText(
    transcribedText: string,
    currentMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] // Expects history
): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
    console.log(`Processing transcribed text: "${transcribedText}"`);

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    // System prompt is assumed to be the first message in currentMessages
    const tools = [ // Define tools available here too
        lookupAddressByNameSchema,
        sendErc20TransferSchema,
        getEthBalanceSchema,
        getErc20BalanceSchema,
        sendEthTransferSchema,
        getTokenAddressSchema,
    ];

    // Add the new transcribed text as a user message to the existing history
    currentMessages.push({ role: 'user', content: transcribedText });

    // This loop mimics the core logic used in interactiveChat
    while (true) {
        console.log("Processing transcribed input...");
        const turnResult = await executeAgentTurn(currentMessages, tools, openai);

        // Add assistant's response to history
        currentMessages.push(turnResult.assistantMessage);

        if (turnResult.error && !turnResult.toolMessages?.length) {
             console.error("Halting transcription processing due to error:", turnResult.error);
             break; // Exit loop on critical error
        }

        if (turnResult.toolMessages && turnResult.toolMessages.length > 0) {
            // Add tool results and continue loop for agent processing
            currentMessages.push(...turnResult.toolMessages);
            console.log(' Agent processing tool results from transcription...');
             continue; // Let agent process tool results
        } else {
            // No tool calls, final response for this input received
            console.log(" Agent finished processing the transcribed text input.");
            break; // Exit loop for this input
        }
    }

    console.log("--- Finished processing transcribed text input ---");
    // Return the updated history
    return currentMessages;
}

// Example setup for using processTranscribedText sequentially
/*
async function runTranscriptionExample() {
    const selfAddress = wallet.address;
    const systemPrompt = `
You are an assistant that helps with Ethereum transactions... (Full prompt)
`;
    // Initialize conversation history
    let conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt }
    ];

    // --- Simulate receiving transcribed text ---

    // First utterance
    const firstText = "What's the address for WETH?";
    console.log("\n--- STT Input 1 ---");
    conversationHistory = await processTranscribedText(firstText, conversationHistory);
    console.log("History after 1st input:", conversationHistory.slice(-3)); // Show recent history

    // Second utterance
    const secondText = "Okay now send 0.01 of it to Bob";
    console.log("\n--- STT Input 2 ---");
    conversationHistory = await processTranscribedText(secondText, conversationHistory);
    console.log("History after 2nd input:", conversationHistory.slice(-4)); // Show recent history

     // Third utterance
    const thirdText = "What is my USDC balance?";
    console.log("\n--- STT Input 3 ---");
    conversationHistory = await processTranscribedText(thirdText, conversationHistory);
    console.log("History after 3rd input:", conversationHistory.slice(-3));
}
*/

// --- Entry Point Logic ---
if (require.main === module) {
    // Uncomment below to run the transcription example instead of examples/chat
    // runTranscriptionExample().catch(err => {
    //      console.error("Unhandled error in runTranscriptionExample:", err);
    //      process.exit(1);
    // });

    // Default behavior: run examples or interactive chat
    if (process.argv.includes('--chat')) {
        interactiveChat().catch(err => {
            console.error("Unhandled error in interactiveChat:", err);
            process.exit(1);
        });
    } else {
        runExamples().catch(err => {
            console.error("Unhandled error in runExamples:", err);
            process.exit(1);
        });
    }
} 