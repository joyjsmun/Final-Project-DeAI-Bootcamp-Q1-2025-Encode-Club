import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { processTranscribedTextInput } from '@/lib/web3-agent'; // Assuming 'lib' is aliased to '@/lib' in tsconfig

export const runtime = 'nodejs'; // Explicitly set runtime (can also be 'edge')
// Using 'nodejs' runtime is generally safer for libraries like ethers that might rely on Node.js APIs.

interface RequestBody {
    text: string;
    history: ChatCompletionMessageParam[]; // Use OpenAI's type
}

export async function POST(request: NextRequest) {
  console.log('API route /api/agent hit');
  try {
    const body = await request.json() as RequestBody;
    const { text, history } = body;

    // Basic validation
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid "text" field in request body' }, { status: 400 });
    }
    if (!Array.isArray(history)) {
       return NextResponse.json({ error: 'Missing or invalid "history" array in request body' }, { status: 400 });
    }

    console.log(`Received text: "${text}"`);
    console.log(`Received history length: ${history.length}`);

    // Ensure history doesn't contain complex objects that can't be cloned easily if needed later
    // For now, we assume history contains valid ChatCompletionMessageParam objects

    // Call the core processing function
    // It will mutate the history array and return it
    const updatedHistory = await processTranscribedTextInput(text, history);

    console.log(`Agent processing complete. Returning updated history length: ${updatedHistory.length}`);

    // Return the entire updated history
    // The client can then extract the latest assistant message(s)
    return NextResponse.json({ history: updatedHistory });

  } catch (error: any) {
    console.error('❌ Error in /api/agent POST handler:', error);

    // Check for specific initialization errors we threw
     if (error.message.includes("Missing PRIVATE_KEY")) {
         return NextResponse.json({ error: 'Server configuration error: Missing required private key.' }, { status: 500 });
     }
     if (error.message.includes("Missing OPENAI_API_KEY")) {
          return NextResponse.json({ error: 'Server configuration error: Missing OpenAI API key.' }, { status: 500 });
     }
     if (error.message.includes("Failed to initialize")) {
         return NextResponse.json({ error: `Server initialization failed: ${error.message}` }, { status: 500 });
     }

    // General error
    return NextResponse.json({ error: 'Internal Server Error', details: error.message || String(error) }, { status: 500 });
  }
} 