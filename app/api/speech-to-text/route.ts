import { createClient } from '@deepgram/sdk';
import { NextRequest, NextResponse } from 'next/server';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '39f33a67474538d19cf6896dd3e8314bfda53117';

export async function POST(request: NextRequest) {
  try {
    // Get audio file from request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('Transcribing audio file:', {
      size: buffer.length,
      type: audioFile.type,
    });

    // Initialize Deepgram client
    const deepgram = createClient(DEEPGRAM_API_KEY);

    // Transcribe audio with financial-specific intents
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      buffer,
      {
        model: 'nova-3',
        detect_language: true,
        smart_format: true,  // 智能格式化，包含标点和大写
        punctuate: true,     // 添加标点符号
        paragraphs: true,    // 段落分割
        diarize: false,
        intents: true,
        custom_intent: [
          'complex_analysis',
          'quick_data_retrieval',
          'news_search',
          'use_custom_analysis_template',
          'timeline_narrative_breakdown_analysis',
        ],
        sentiment: true,
        topics: true,
      }
    );

    if (error) {
      console.error('Deepgram API error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Deepgram transcription failed',
          details: error
        },
        { status: 500 }
      );
    }

    console.log('Deepgram result:', {
      hasResult: !!result,
      hasTranscript: !!result?.results?.channels?.[0]?.alternatives?.[0]?.transcript,
    });

    // Extract transcript text
    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

    // Extract intents and sentiment for potential use
    const intents = result?.results?.intents?.segments || [];
    const sentiment = result?.results?.sentiments?.segments || [];
    const topics = result?.results?.topics?.segments || [];

    return NextResponse.json({
      success: true,
      transcript,
      metadata: {
        language: result?.results?.channels?.[0]?.detected_language,
        confidence: result?.results?.channels?.[0]?.alternatives?.[0]?.confidence,
        intents: intents.map((i: any) => ({
          intent: i.intents?.[0]?.intent,
          confidence: i.intents?.[0]?.confidence,
        })),
        sentiment: sentiment.map((s: any) => ({
          sentiment: s.sentiment,
          confidence: s.sentiment_score,
        })),
        topics: topics.map((t: any) => ({
          topic: t.topics?.[0]?.topic,
          confidence: t.topics?.[0]?.confidence,
        })),
      },
    });
  } catch (error) {
    console.error('Speech-to-text error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
