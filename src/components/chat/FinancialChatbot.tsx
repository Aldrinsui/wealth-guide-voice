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

  const getBeginnerFriendlyResponse = (userMessage: string): string => {
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

    // Simple greeting responses
    if (message.includes('hello') || message.includes('hi') || message.includes('help')) {
      return `Hi there! 👋 I'm here to help you take control of your money - don't worry, we'll keep it simple!

Here's what I can help you with:
💰 **Create a simple budget** (how to split your money)
🏦 **Plan for retirement** (saving for when you're older)
🚨 **Emergency savings** (money for unexpected things)
📊 **Pay off debt** (get rid of what you owe)
📈 **Start investing** (grow your money)

What would you like to start with? Just pick one topic or tell me about your situation!`;
    }

    // Budget - Beginner friendly
    if (message.includes('budget') || message.includes('spending') || message.includes('money')) {
      if (chatContext.userData.income) {
        const budget = calculateBudget(chatContext.userData.income);
        return `Great! Let me create a simple budget for you. 📊

**Your ${formatCurrency(chatContext.userData.income)} monthly income should be split like this:**

🏠 **Needs (${formatCurrency(budget.needs)})** - The must-haves:
• Rent/mortgage
• Groceries & utilities  
• Transportation
• Minimum debt payments

🎉 **Wants (${formatCurrency(budget.wants)})** - The fun stuff:
• Dining out & entertainment
• Hobbies & subscriptions
• Shopping for non-essentials

💰 **Savings (${formatCurrency(budget.savings)})** - Your future self:
• Emergency fund (start here!)
• Retirement savings
• Goals like vacation or house

**Getting Started:**
1. Track your spending for a week
2. Start with just the emergency fund
3. Use apps like Mint or YNAB to help

Would you like help with any specific part of this budget?`;
      } else {
        setChatContext(prev => ({ ...prev, lastTopic: 'budget' }));
        return `I'd love to help you create a simple budget! 💰

First, I need to know your monthly income. This includes:
• Your job salary (after taxes)
• Any side income
• Other regular money coming in

Just tell me something like: "I make $3,000 per month" or "My income is $50,000 per year"

Don't worry - I won't store this info anywhere, it's just for our conversation! 🔒`;
      }
    }
    
    // Retirement - Simplified
    if (message.includes('retire') || message.includes('pension') || message.includes('401k')) {
      if (chatContext.userData.income && chatContext.userData.age) {
        const retirementPlan = calculateRetirementPlan(
          chatContext.userData.age,
          65,
          chatContext.userData.currentSavings || 0,
          chatContext.userData.income
        );
        return `Let me show you a simple retirement plan! 🎯

**Here's the good news:**
• You have ${retirementPlan.yearsToRetirement} years to save
• If you save ${formatCurrency(retirementPlan.monthlyContribution)} per month
• You could have ${formatCurrency(retirementPlan.projectedRetirementFund)} when you retire!
• That's about ${formatCurrency(retirementPlan.monthlyIncomeAtRetirement)} per month to live on

**Start Simple:**
1. **Get your employer match** - Free money if your job offers 401k matching
2. **Open a Roth IRA** - Tax-free growth (max $6,500/year)
3. **Invest in index funds** - Like buying a piece of the whole stock market

**Don't worry about being perfect** - even $50/month is a great start! The important thing is to begin.

Want me to explain any of these steps in more detail?`;
      } else {
        setChatContext(prev => ({ ...prev, lastTopic: 'retirement' }));
        return `Planning for retirement is smart! 🌟 Let me make this super simple.

I need two quick things:
1. **Your age** (like "I'm 25")
2. **Your monthly income** (like "I make $4,000 per month")

Then I can show you exactly how much to save and where to put it!

The earlier you start, the easier it gets because of "compound interest" (basically your money makes money). 📈`;
      }
    }
    
    // Emergency fund - Very beginner friendly
    if (message.includes('emergency') || (message.includes('savings') && !message.includes('retirement'))) {
      if (chatContext.userData.income) {
        const monthlyExpenses = chatContext.userData.expenses || chatContext.userData.income * 0.8;
        const emergencyPlan = calculateEmergencyFund(monthlyExpenses, chatContext.userData.currentSavings || 0, chatContext.userData.income);
        return `Perfect! Let's build your "sleep better at night" fund! 😴

**Why you need this:**
Emergency funds are for when life happens - job loss, car repair, medical bills, etc.

**Your Emergency Fund Plan:**
🎯 **Goal:** ${formatCurrency(emergencyPlan.targetAmount)} (covers 6 months of expenses)
💰 **Save each month:** ${formatCurrency(emergencyPlan.monthlySavingsNeeded)}
⏰ **Time to reach goal:** ${emergencyPlan.monthsToGoal} months

**Super Simple Steps:**
1. **Start with $500** - Covers most small emergencies
2. **Use a separate savings account** - Keep it away from spending money
3. **Automate it** - Set up automatic transfer each payday
4. **High-yield savings** - Online banks like Ally or Marcus pay more interest

**Pro tip:** Start small! Even $25/week adds up to $1,300 in a year.

Ready to open a savings account, or have questions about where to keep this money?`;
      } else {
        return `Smart thinking! An emergency fund is like an umbrella ☂️ - you hope you never need it, but you're glad it's there!

To create your plan, tell me your monthly income (like "I make $3,500 per month").

Here's why it matters: If you make $3,000/month, you'd want about $15,000 saved for emergencies. Sounds like a lot? Don't worry - we'll start small and build up! 💪`;
      }
    }
    
    // Debt payoff - Simplified
    if (message.includes('debt') || message.includes('loan') || message.includes('credit')) {
      const debtAmount = extractNumberFromText(userMessage);
      if (debtAmount) {
        const interestRate = 0.18; // Default credit card rate
        const minimumPayment = debtAmount * 0.02;
        const aggressivePayment = minimumPayment * 2;
        
        const minPayoff = calculateDebtPayoff(debtAmount, interestRate, minimumPayment);
        const aggressivePayoff = calculateDebtPayoff(debtAmount, interestRate, aggressivePayment);
        
        return `Let's crush that ${formatCurrency(debtAmount)} debt! 💪

**Two paths to freedom:**

🐌 **Minimum payments (${formatCurrency(minimumPayment)}/month):**
• Takes ${Math.round(minPayoff.monthsToPayoff/12)} years
• You'll pay ${formatCurrency(minPayoff.totalInterest)} in interest

🚀 **Double payments (${formatCurrency(aggressivePayment)}/month):**
• Takes ${Math.round(aggressivePayoff.monthsToPayoff/12)} years  
• You'll pay ${formatCurrency(aggressivePayoff.totalInterest)} in interest
• **You save ${formatCurrency(minPayoff.totalInterest - aggressivePayoff.totalInterest)}!**

**Simple debt strategy:**
1. **Pay minimums on everything**
2. **Put extra money on highest interest rate debt**
3. **Once that's paid off, move to the next highest**

**Quick wins:**
• Call your credit card company and ask for a lower rate
• Consider a balance transfer to 0% interest card
• Use any tax refund or bonus toward debt

Can you share what interest rate you're paying? That helps me give better advice!`;
      } else {
        return `Tackling debt is one of the best things you can do for your future! 🎯

To help you create a payoff plan, I need:
• **How much you owe** (like "$5,000 in credit cards")
• **What interest rate** (look at your statement - usually 15-25%)

Don't have the exact numbers? No problem! Just tell me roughly:
"I have about $3,000 in credit card debt"

Then I'll show you exactly how to pay it off and how much money you'll save! 💰`;
      }
    }
    
    // Investment - Very beginner focused
    if (message.includes('invest') || message.includes('stock') || message.includes('portfolio')) {
      const age = chatContext.userData.age || 30;
      const stockAllocation = Math.min(90, 100 - age); // Cap at 90% stocks
      const bondAllocation = 100 - stockAllocation;
      
      return `Investing sounds scary, but it's actually pretty simple! 📈

**Think of it like this:** Instead of your money sitting in a low-interest savings account, you're letting it grow by owning tiny pieces of successful companies.

**Your simple starter portfolio:**
• **${stockAllocation}% Stocks** - Companies that grow over time
• **${bondAllocation}% Bonds** - Safer, steady income

**Beginner's Investment Plan:**
1. **Start with $50-100/month** - Don't invest money you need soon!
2. **Use index funds** - Like buying the whole stock market at once
3. **Pick 2-3 funds maximum** - Don't overthink it

**Recommended funds for beginners:**
• **VTI** - Owns every US company (stock fund)
• **VXUS** - Owns international companies  
• **BND** - Safe bonds for stability

**Where to start:**
• Fidelity, Vanguard, or Schwab (low fees)
• Start with a Roth IRA (tax-free growth!)
• Set up automatic investing

**Important:** Only invest money you won't need for 5+ years. Emergency fund comes first!

Want me to walk you through opening your first investment account?`;
    }

    // Catch-all for beginners
    if (message.includes('start') || message.includes('begin') || message.includes('new') || message.includes('first')) {
      return `Welcome to your money journey! 🌟 Let's start with the basics.

**The "Baby Steps" approach:**
1. **$500 mini emergency fund** (for small surprises)
2. **Pay off high-interest debt** (credit cards first)
3. **Build full emergency fund** (3-6 months expenses)
4. **Start investing** (retirement accounts)
5. **Save for goals** (house, vacation, etc.)

**Where are you right now?**
• "I have no savings" ➜ Let's start with step 1!
• "I have some debt" ➜ Let's make a payoff plan!
• "I want to invest" ➜ Let's check if you're ready!

Just tell me where you are and what feels most important to you right now. We'll take it one step at a time! 🚶‍♀️`;
    }
    
    return `I'd love to help you with that! 😊 

For the best advice, it helps if you share:
• Your situation (like "I'm new to budgeting" or "I want to start investing")
• Your monthly income (roughly is fine!)
• Your age (helps with planning)

Or just pick a topic:
💰 "Help me budget" 
🏦 "Plan for retirement"
🚨 "Build emergency savings"
📊 "Pay off debt"
📈 "Start investing"

Remember - everyone starts somewhere, and there are no dumb questions! 🌟`;
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
      const botResponse = getBeginnerFriendlyResponse(userInput);
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
              onClick={() => setInputValue("I'm new to budgeting and make $4000 per month")}
              className="text-xs"
            >
              <PiggyBank className="w-3 h-3 mr-1" />
              Simple Budget
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("I'm 25 and want to start saving for retirement")}
              className="text-xs"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Retirement Start
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Help me start building an emergency fund")}
              className="text-xs"
            >
              <Calculator className="w-3 h-3 mr-1" />
              Emergency Fund
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};