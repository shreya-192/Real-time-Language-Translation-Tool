import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Copy, Share2, Languages, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Language {
  code: string;
  name: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
];

const TranslationApp = () => {
  const [isListening, setIsListening] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = sourceLang;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setSourceText(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Speech Recognition Error",
          description: "Please check your microphone and try again.",
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [sourceLang, toast]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.lang = sourceLang;
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        toast({
          title: "Speech Recognition Not Supported",
          description: "Your browser doesn't support speech recognition.",
          variant: "destructive",
        });
      }
    }
  };

  const translateText = async (text: string) => {
    if (!text.trim()) return '';
    
    // Don't translate if source and target languages are the same
    if (sourceLang === targetLang) {
      return text;
    }
    
    setIsTranslating(true);
    try {
      console.log(`Translating "${text}" from ${sourceLang} to ${targetLang}`);
      
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`);
      const data = await response.json();
      
      console.log('Translation API response:', data);
      
      if (data.responseStatus === 200 || data.responseStatus === '200') {
        const translatedText = data.responseData.translatedText;
        
        // Check if translation is empty or seems invalid
        if (!translatedText || translatedText.trim() === '') {
          console.warn('Empty translation received, checking matches');
          
          // Try to find a better translation from matches
          if (data.matches && data.matches.length > 0) {
            const bestMatch = data.matches.find((match: any) => 
              match.translation && 
              match.translation.trim() !== '' &&
              parseInt(match.quality) > 50
            );
            
            if (bestMatch) {
              console.log('Using best match:', bestMatch.translation);
              return bestMatch.translation;
            }
          }
          
          throw new Error('No valid translation found');
        }
        
        // Check for obvious translation errors (like returning the same text)
        if (translatedText.toLowerCase() === text.toLowerCase()) {
          console.warn('Translation returned same text, checking matches');
          
          if (data.matches && data.matches.length > 0) {
            const bestMatch = data.matches.find((match: any) => 
              match.translation && 
              match.translation.trim() !== '' &&
              match.translation.toLowerCase() !== text.toLowerCase() &&
              parseInt(match.quality) > 50
            );
            
            if (bestMatch) {
              console.log('Using alternative match:', bestMatch.translation);
              return bestMatch.translation;
            }
          }
        }
        
        return translatedText;
      } else {
        console.error('Translation API error:', data.responseDetails);
        throw new Error(data.responseDetails || 'Translation failed');
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Translation Error",
        description: "Unable to translate text. Please try again with different text.",
        variant: "destructive",
      });
      return text; // Return original text as fallback
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    if (sourceText && sourceText.trim()) {
      const timeoutId = setTimeout(async () => {
        const translation = await translateText(sourceText);
        setTranslatedText(translation);
      }, 1000);
      return () => clearTimeout(timeoutId);
    } else {
      setTranslatedText('');
    }
  }, [sourceText, sourceLang, targetLang]);

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied successfully.",
    });
  };

  const speakText = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      speechSynthesis.speak(utterance);
    }
  };

  const shareText = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Translation',
          text: text,
        });
      } catch (error) {
        copyToClipboard(text);
      }
    } else {
      copyToClipboard(text);
    }
  };

  console.log('Available languages:', LANGUAGES);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            VoiceTranslate
          </h1>
          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto">
            Real-time speech recognition and translation across multiple languages
          </p>
        </div>

        {/* Language Selection */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-xl mb-6">
          <div className="p-6">
            <div className="flex items-center justify-center gap-4 md:gap-8">
              <div className="flex-1 max-w-xs">
                <label className="block text-sm font-medium text-slate-300 mb-2">From</label>
                <Select value={sourceLang} onValueChange={setSourceLang}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {LANGUAGES.map((lang) => (
                      <SelectItem 
                        key={lang.code} 
                        value={lang.code}
                        className="text-white hover:bg-slate-700 focus:bg-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={swapLanguages}
                className="bg-slate-700/50 border-slate-600 hover:bg-slate-600/50 mt-6"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </Button>

              <div className="flex-1 max-w-xs">
                <label className="block text-sm font-medium text-slate-300 mb-2">To</label>
                <Select value={targetLang} onValueChange={setTargetLang}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {LANGUAGES.map((lang) => (
                      <SelectItem 
                        key={lang.code} 
                        value={lang.code}
                        className="text-white hover:bg-slate-700 focus:bg-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* Translation Interface */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Source Text */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {LANGUAGES.find(l => l.code === sourceLang)?.flag} Source Text
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleListening}
                    className={`${
                      isListening 
                        ? 'bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30' 
                        : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    {isListening ? 'Stop' : 'Record'}
                  </Button>
                </div>
              </div>
              
              <Textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Start speaking or type your text here..."
                className="min-h-[200px] bg-slate-700/30 border-slate-600 text-white placeholder-slate-400 resize-none"
              />
              
              {sourceText && (
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => speakText(sourceText, sourceLang)}
                    className="bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
                  >
                    <Volume2 className="w-4 h-4 mr-1" />
                    Listen
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(sourceText)}
                    className="bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Translated Text */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {LANGUAGES.find(l => l.code === targetLang)?.flag} Translation
                </h3>
                {isTranslating && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Translating...</span>
                  </div>
                )}
              </div>
              
              <div className="min-h-[200px] bg-slate-700/30 border border-slate-600 rounded-lg p-3 text-white">
                {translatedText || (
                  <span className="text-slate-400">Translation will appear here...</span>
                )}
              </div>
              
              {translatedText && (
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => speakText(translatedText, targetLang)}
                    className="bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
                  >
                    <Volume2 className="w-4 h-4 mr-1" />
                    Listen
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(translatedText)}
                    className="bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => shareText(translatedText)}
                    className="bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    Share
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Card className="bg-slate-800/30 border-slate-700 backdrop-blur-xl">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Real-time Speech</h3>
              <p className="text-slate-400">Advanced speech recognition technology for accurate voice-to-text conversion</p>
            </div>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700 backdrop-blur-xl">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <Languages className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Multi-language</h3>
              <p className="text-slate-400">Support for 12+ languages with automatic language detection</p>
            </div>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700 backdrop-blur-xl">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-red-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <Volume2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Audio Playback</h3>
              <p className="text-slate-400">Listen to translations with natural text-to-speech synthesis</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TranslationApp;
