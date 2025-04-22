import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Create a File object from the Blob
    const file = new File([audioFile], 'audio.webm', { type: 'audio/webm' });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "en",
      response_format: "text",
    });

    return NextResponse.json({ transcription });
  } catch (error) {
    console.error("Error processing transcription:", error);
    return NextResponse.json(
      { error: "Failed to process transcription" },
      { status: 500 }
    );
  }
}
