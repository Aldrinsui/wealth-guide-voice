import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "./ChatMessage";
import { VoiceControls } from "./VoiceControls";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { Send, DollarSign, TrendingUp, PiggyBank, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  calculateBudget, 
  calculateRetirementPlan, 
  calculateEmergencyFund, 
  calculateDebtPayoff,
  extractNumberFromText,
  formatCurrency,
  UserFinancialData 
} from "@/lib/financialCalculations";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatContext {
  userData: UserFinancialData;
  conversationState: 'greeting' | 'gathering_info' | 'providing_advice';
  lastTopic: string;
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
  const [chatContext, setChatContext] = useState<ChatContext>({
    userData: {},
    conversationState: 'greeting',
    lastTopic: ''
  });
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

  const getPersonalizedResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    const income = extractNumberFromText(userMessage);
    
    // Update user data if income is mentioned
    if (income && (message.includes('income') || message.includes('salary') || message.includes('make') || message.includes('earn'))) {
      setChatContext(prev => ({
        ...prev,
        userData: { ...prev.userData, income },
        conversationState: 'gathering_info'
      }));
    }
    
    // Extract age if mentioned
    const ageMatch = userMessage.match(/(\d+)\s*years?\s*old|age\s*(\d+)|i'm\s*(\d+)/i);
    if (ageMatch) {
      const age = parseInt(ageMatch[1] || ageMatch[2] || ageMatch[3]);
      setChatContext(prev => ({
        ...prev,
        userData: { ...prev.userData, age }
      }));
    }
    
    // Budget calculation and advice
    if (message.includes('budget') || message.includes('spending')) {
      if (chatContext.userData.income) {
        const budget = calculateBudget(chatContext.userData.income);
        return `Based on your ${formatCurrency(chatContext.userData.income)} income, here's your personalized 50/30/20 budget:
        
📊 **Monthly Budget Breakdown:**
• **Needs (50%)**: ${formatCurrency(budget.needs)} - rent, utilities, groceries
• **Wants (30%)**: ${formatCurrency(budget.wants)} - entertainment, dining out
• **Savings (20%)**: ${formatCurrency(budget.savings)} - emergency fund, investments

This budget will help you maintain financial stability while building wealth. Would you like me to help you break down any of these categories further?`;
      } else {
        setChatContext(prev => ({ ...prev, lastTopic: 'budget' }));
        return "I'd love to create a personalized budget for you! What's your monthly income? Just tell me something like 'I make $5000 per month' and I'll calculate your optimal budget breakdown.";
      }
    }
    
    // Retirement planning
    if (message.includes('retire') || message.includes('pension') || message.includes('401k')) {
      if (chatContext.userData.income && chatContext.userData.age) {
        const retirementPlan = calculateRetirementPlan(
          chatContext.userData.age,
          65, // default retirement age
          chatContext.userData.currentSavings || 0,
          chatContext.userData.income
        );
        return `Based on your profile (age ${chatContext.userData.age}, income ${formatCurrency(chatContext.userData.income)}), here's your personalized retirement plan:

🎯 **Retirement Projection:**
• **Years to retirement**: ${retirementPlan.yearsToRetirement} years
• **Recommended monthly contribution**: ${formatCurrency(retirementPlan.monthlyContribution)}
• **Projected retirement fund**: ${formatCurrency(retirementPlan.projectedRetirementFund)}
• **Monthly income at retirement**: ${formatCurrency(retirementPlan.monthlyIncomeAtRetirement)}

This assumes a 7% annual return and 15% contribution rate. Want to adjust these parameters?`;
      } else {
        setChatContext(prev => ({ ...prev, lastTopic: 'retirement' }));
        return "Let me create a personalized retirement plan! I'll need your age and monthly income. For example: 'I'm 30 years old and make $6000 per month.'";
      }
    }
    
    // Emergency fund calculation
    if (message.includes('emergency') || (message.includes('savings') && !message.includes('retirement'))) {
      if (chatContext.userData.income) {
        const monthlyExpenses = chatContext.userData.expenses || chatContext.userData.income * 0.8; // Estimate 80% of income
        const emergencyPlan = calculateEmergencyFund(monthlyExpenses, chatContext.userData.currentSavings || 0, chatContext.userData.income);
        return `Here's your personalized emergency fund plan:

💰 **Emergency Fund Strategy:**
• **Target amount**: ${formatCurrency(emergencyPlan.targetAmount)} (6 months expenses)
• **Current savings**: ${formatCurrency(emergencyPlan.currentAmount)}
• **Monthly savings needed**: ${formatCurrency(emergencyPlan.monthlySavingsNeeded)}
• **Time to goal**: ${emergencyPlan.monthsToGoal} months

Start with $1,000 as your first milestone, then build to the full 6-month target. Keep this in a high-yield savings account!`;
      } else {
        return "I'll help you plan your emergency fund! What's your monthly income and current savings amount?";
      }
    }
    
    // Debt payoff calculation
    if (message.includes('debt') || message.includes('loan') || message.includes('credit')) {
      const debtAmount = extractNumberFromText(userMessage);
      if (debtAmount) {
        const interestRate = 0.18; // Default credit card rate
        const minimumPayment = debtAmount * 0.02; // 2% minimum
        const aggressivePayment = minimumPayment * 2;
        
        const minPayoff = calculateDebtPayoff(debtAmount, interestRate, minimumPayment);
        const aggressivePayoff = calculateDebtPayoff(debtAmount, interestRate, aggressivePayment);
        
        return `Here's your debt payoff strategy for ${formatCurrency(debtAmount)}:

💳 **Debt Payoff Options:**

**Minimum Payment (${formatCurrency(minimumPayment)}/month):**
• Time to payoff: ${minPayoff.monthsToPayoff} months
• Total interest: ${formatCurrency(minPayoff.totalInterest)}

**Aggressive Payment (${formatCurrency(aggressivePayment)}/month):**
• Time to payoff: ${aggressivePayoff.monthsToPayoff} months  
• Total interest: ${formatCurrency(aggressivePayoff.totalInterest)}
• **Savings**: ${formatCurrency(minPayoff.totalInterest - aggressivePayoff.totalInterest)}

I recommend the debt avalanche method: pay minimums on all debts, then put extra money toward the highest interest rate debt first!`;
      } else {
        return "I'll help you create a debt payoff plan! What's your total debt amount and interest rate? For example: 'I have $5000 in credit card debt at 18% interest.'";
      }
    }
    
    // Investment advice
    if (message.includes('invest') || message.includes('stock') || message.includes('portfolio')) {
      const age = chatContext.userData.age || 30;
      const stockAllocation = 100 - age; // Rule of thumb
      const bondAllocation = age;
      
      return `Based on your profile, here's your personalized investment strategy:

📈 **Investment Allocation:**
• **Stocks/Equity funds**: ${stockAllocation}% (growth focus)
• **Bonds/Fixed income**: ${bondAllocation}% (stability)

**Recommended Portfolio:**
• 70% Low-cost index funds (VTI, VXUS)
• 20% Bond index funds (BND)
• 10% REITs or commodities

**Investment priority order:**
1. Max employer 401(k) match first
2. Max Roth IRA ($6,500/year)
3. Additional 401(k) contributions
4. Taxable investment accounts

Start with $100/month if you're new to investing. Dollar-cost averaging reduces risk!`;
    }
    
    // Default responses
    if (message.includes('hello') || message.includes('hi') || message.includes('help')) {
      return FINANCIAL_RESPONSES.greeting;
    }
    
    return "I'd love to help with that! For personalized advice, share some details like your income, age, or specific financial goals. I can create custom calculations for budgets, retirement, debt payoff, and investment strategies.";
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
      const botResponse = getPersonalizedResponse(userInput);
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
              onClick={() => setInputValue("I make $5000 per month, help me create a budget")}
              className="text-xs"
            >
              <PiggyBank className="w-3 h-3 mr-1" />
              Budget Calculator
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("I'm 30 years old and make $6000 per month, help me plan for retirement")}
              className="text-xs"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Retirement Plan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("I have $5000 in credit card debt, help me pay it off")}
              className="text-xs"
            >
              <Calculator className="w-3 h-3 mr-1" />
              Debt Payoff
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};