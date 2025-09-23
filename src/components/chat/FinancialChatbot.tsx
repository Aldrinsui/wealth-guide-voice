import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "./ChatMessage";
import { VoiceControls } from "./VoiceControls";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { Send, DollarSign, TrendingUp, PiggyBank } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const FINANCIAL_RESPONSES = {
  greeting: "Hello! I'm your AI Financial Planning Assistant. I can help you with budgeting, investment strategies, retirement planning, and more. How can I assist you today?",
  budget: "For effective budgeting, I recommend the 50/30/20 rule: 50% for needs, 30% for wants, and 20% for savings and debt repayment. Would you like me to help you create a personalized budget?",
  investment: "Investment strategies depend on your goals and risk tolerance. For beginners, I suggest starting with diversified index funds or ETFs. What's your investment timeline and risk comfort level?",
  retirement: "For retirement planning, aim to save 10-15% of your income. Consider maximizing employer 401(k) matches and opening an IRA. When would you like to retire, and what lifestyle do you envision?",
  emergency: "An emergency fund should cover 3-6 months of expenses. Start with $1,000 as an initial goal, then gradually build up. Keep it in a high-yield savings account for easy access.",
  debt: "To tackle debt effectively, list all debts with balances and interest rates. Consider the debt avalanche method (highest interest first) or debt snowball (smallest balance first). Which approach appeals to you?",
  default: "That's a great financial question! I'd be happy to provide personalized advice. Could you share more details about your specific situation, goals, and timeline?"
};

export const FinancialChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: FINANCIAL_RESPONSES.greeting,
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const {
    isListening,
    transcript,
    isSupported: speechRecognitionSupported,
    startListening,
    stopListening,
    resetTranscript,
    initializeRecognition
  } = useSpeechRecognition();

  const {
    speak,
    stop: stopSpeaking,
    isSpeaking,
    isSupported: textToSpeechSupported
  } = useTextToSpeech();

  useEffect(() => {
    initializeRecognition();
  }, [initializeRecognition]);

  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getFinancialResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('budget') || message.includes('spending')) {
      return FINANCIAL_RESPONSES.budget;
    } else if (message.includes('invest') || message.includes('stock') || message.includes('portfolio')) {
      return FINANCIAL_RESPONSES.investment;
    } else if (message.includes('retire') || message.includes('pension') || message.includes('401k')) {
      return FINANCIAL_RESPONSES.retirement;
    } else if (message.includes('emergency') || message.includes('savings')) {
      return FINANCIAL_RESPONSES.emergency;
    } else if (message.includes('debt') || message.includes('loan') || message.includes('credit')) {
      return FINANCIAL_RESPONSES.debt;
    } else if (message.includes('hello') || message.includes('hi') || message.includes('help')) {
      return FINANCIAL_RESPONSES.greeting;
    } else {
      return FINANCIAL_RESPONSES.default;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = inputValue;
    setInputValue('');

    // Stop any ongoing speech
    if (isSpeaking) {
      stopSpeaking();
    }

    // Simulate typing delay
    setTimeout(() => {
      const botResponse = getFinancialResponse(userInput);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

      // Speak the response if speech is enabled
      if (isSpeechEnabled && textToSpeechSupported) {
        setTimeout(() => {
          speak(botResponse);
        }, 500);
      }
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceToggle = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
    setIsSpeechEnabled(!isSpeechEnabled);
    toast({
      title: isSpeechEnabled ? "Speech disabled" : "Speech enabled",
      description: isSpeechEnabled 
        ? "I will no longer read responses aloud" 
        : "I will now read responses aloud"
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-background">
      {/* Header */}
      <div className="bg-card border-b p-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Financial Planning Assistant</h1>
            <p className="text-sm text-muted-foreground">Your AI-powered financial advisor</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="w-4 h-4 text-success" />
            <span>Smart Financial Guidance</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message.text}
              isUser={message.isUser}
              timestamp={message.timestamp}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-card border-t p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Voice Controls */}
          <VoiceControls
            onStartListening={startListening}
            onStopListening={stopListening}
            onToggleSpeech={handleVoiceToggle}
            isListening={isListening}
            isSpeechEnabled={isSpeechEnabled}
            isSupported={speechRecognitionSupported}
          />

          {/* Text Input */}
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about budgeting, investments, retirement planning..."
              className="flex-1"
              disabled={isListening}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isListening}
              variant="gradient"
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Help me create a budget")}
              className="text-xs"
            >
              <PiggyBank className="w-3 h-3 mr-1" />
              Budget Help
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("What's a good investment strategy?")}
              className="text-xs"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Investment Tips
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("How much should I save for retirement?")}
              className="text-xs"
            >
              <DollarSign className="w-3 h-3 mr-1" />
              Retirement Planning
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};