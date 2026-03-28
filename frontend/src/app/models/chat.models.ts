export interface RagSource {
  fileName?: string;
  source?: string;
  pageNumber?: number;
  chunk?: string;
  text?: string;
}

export interface RagAudio {
  data: string;
  mimeType?: string;
  text?: string;
}

export interface RagAnswer {
  sessionId: string;
  question?: string;
  answer?: string;
  transcription?: string;
  sources?: RagSource[];
  audio?: RagAudio;
  audioError?: string;
}

export type MessageRole = 'user' | 'ai' | 'error';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text?: string;
  files?: string[];
  transcription?: string;
  sources?: RagSource[];
  audio?: RagAudio;
  audioError?: string;
  audioBlobUrl?: string;
}
