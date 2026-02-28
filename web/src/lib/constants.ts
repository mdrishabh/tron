/**
 * App-wide constants.
 */

export const LANGUAGES = [
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'en-IN', name: 'English (India)' },
  { code: 'bn-IN', name: 'Bengali' },
  { code: 'ta-IN', name: 'Tamil' },
  { code: 'te-IN', name: 'Telugu' },
  { code: 'kn-IN', name: 'Kannada' },
  { code: 'ml-IN', name: 'Malayalam' },
  { code: 'mr-IN', name: 'Marathi' },
  { code: 'gu-IN', name: 'Gujarati' },
  { code: 'pa-IN', name: 'Punjabi' },
  { code: 'od-IN', name: 'Odia' },
]

export const TONES = [
  // Core
  { value: 'professional', label: 'Professional', emoji: '👔', description: 'Polished and businesslike' },
  { value: 'friendly', label: 'Friendly', emoji: '😊', description: 'Warm and approachable' },
  { value: 'casual', label: 'Casual', emoji: '✌️', description: 'Relaxed, like chatting with a friend' },
  { value: 'formal', label: 'Formal', emoji: '🏩', description: 'Respectful and structured' },
  { value: 'empathetic', label: 'Empathetic', emoji: '🧡', description: 'Understanding and supportive' },
  // Personality
  { value: 'energetic', label: 'Energetic', emoji: '⚡', description: 'High energy, fast-paced, pumped up' },
  { value: 'excited', label: 'Excited', emoji: '🎉', description: 'Enthusiastic and thrilled about everything' },
  { value: 'happy', label: 'Happy', emoji: '😄', description: 'Cheerful, positive, always smiling' },
  { value: 'calm', label: 'Calm', emoji: '🧘', description: 'Peaceful, patient, and soothing' },
  { value: 'witty', label: 'Witty', emoji: '😏', description: 'Clever humor, quick comebacks' },
  { value: 'flirty', label: 'Flirty', emoji: '😉', description: 'Playful, charming, teasing' },
  { value: 'assertive', label: 'Assertive', emoji: '💪', description: 'Confident, direct, no-nonsense' },
  { value: 'caring', label: 'Caring', emoji: '🤗', description: 'Nurturing, protective, gentle' },
  { value: 'persuasive', label: 'Persuasive', emoji: '🎯', description: 'Convincing, motivating, closer' },
  { value: 'humorous', label: 'Humorous', emoji: '😂', description: 'Funny, lighthearted, cracks jokes' },
]

export const LLM_PROVIDERS = [
  { value: 'ollama', label: 'Ollama (Local, Free)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'custom', label: 'Custom Endpoint' },
]

export const LLM_MODELS: Record<string, string[]> = {
  ollama: ['qwen2.5:32b', 'llama3.3:70b', 'sarvam-m', 'deepseek-r1:32b', 'mistral:7b'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-3.5-turbo'],
  gemini: ['gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-1.5-flash'],
  custom: [],
}

export const TTS_MODELS = [
  { value: 'bulbul:v3-beta', label: 'Bulbul v3 Beta', description: 'Latest — best quality, natural prosody, 25 voices', isDefault: true },
  { value: 'bulbul:v2', label: 'Bulbul v2', description: 'Stable — fast & reliable, 7 voices', isDefault: false },
]

export const CALL_OUTCOMES = [
  'interested',
  'not_interested',
  'callback',
  'wrong_number',
  'voicemail',
  'completed',
  'no_answer',
  'busy',
  'failed',
]

export const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
]

export const NODE_TYPES = [
  { type: 'start_outbound', label: 'Start (Outbound)', category: 'trigger', icon: 'PhoneOutgoing' },
  { type: 'start_inbound', label: 'Start (Inbound)', category: 'trigger', icon: 'PhoneIncoming' },
  { type: 'greeting', label: 'Greeting', category: 'speech', icon: 'MessageCircle' },
  { type: 'speak', label: 'Speak', category: 'speech', icon: 'Volume2' },
  { type: 'listen', label: 'Listen', category: 'speech', icon: 'Mic' },
  { type: 'llm_response', label: 'LLM Response', category: 'speech', icon: 'Brain' },
  { type: 'branch_intent', label: 'Branch (Intent)', category: 'logic', icon: 'GitBranch' },
  { type: 'branch_keyword', label: 'Branch (Keyword)', category: 'logic', icon: 'Search' },
  { type: 'branch_sentiment', label: 'Branch (Sentiment)', category: 'logic', icon: 'Heart' },
  { type: 'set_variable', label: 'Set Variable', category: 'action', icon: 'Tag' },
  { type: 'webhook', label: 'Webhook', category: 'action', icon: 'Globe' },
  { type: 'transfer', label: 'Transfer', category: 'action', icon: 'PhoneForwarded' },
  { type: 'wait', label: 'Wait', category: 'action', icon: 'Clock' },
  { type: 'end_call', label: 'End Call', category: 'ending', icon: 'PhoneOff' },
]
