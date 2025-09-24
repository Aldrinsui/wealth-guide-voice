export interface UserFinancialData {
  income?: number;
  expenses?: number;
  age?: number;
  retirementAge?: number;
  currentSavings?: number;
  debt?: number;
  riskTolerance?: 'low' | 'medium' | 'high';
  goals?: string[];
}

export interface BudgetPlan {
  totalIncome: number;
  needs: number;
  wants: number;
  savings: number;
  needsPercentage: number;
  wantsPercentage: number;
  savingsPercentage: number;
}

export interface RetirementPlan {
  yearsToRetirement: number;
  monthlyContribution: number;
  projectedRetirementFund: number;
  monthlyIncomeAtRetirement: number;
}

export interface EmergencyFundPlan {
  targetAmount: number;
  currentAmount: number;
  monthsToGoal: number;
  monthlySavingsNeeded: number;
}

export const calculateBudget = (income: number): BudgetPlan => {
  const needs = income * 0.5;
  const wants = income * 0.3;
  const savings = income * 0.2;
  
  return {
    totalIncome: income,
    needs,
    wants,
    savings,
    needsPercentage: 50,
    wantsPercentage: 30,
    savingsPercentage: 20
  };
};

export const calculateRetirementPlan = (
  currentAge: number,
  retirementAge: number,
  currentSavings: number,
  monthlyIncome: number,
  contributionRate: number = 0.15
): RetirementPlan => {
  const yearsToRetirement = retirementAge - currentAge;
  const monthlyContribution = monthlyIncome * contributionRate;
  const annualReturn = 0.07; // 7% average return
  const monthlyReturn = annualReturn / 12;
  
  // Future value of current savings
  const futureValueCurrent = currentSavings * Math.pow(1 + annualReturn, yearsToRetirement);
  
  // Future value of monthly contributions
  const futureValueContributions = monthlyContribution * 
    ((Math.pow(1 + monthlyReturn, yearsToRetirement * 12) - 1) / monthlyReturn);
  
  const projectedRetirementFund = futureValueCurrent + futureValueContributions;
  const monthlyIncomeAtRetirement = projectedRetirementFund * 0.04 / 12; // 4% rule
  
  return {
    yearsToRetirement,
    monthlyContribution,
    projectedRetirementFund,
    monthlyIncomeAtRetirement
  };
};

export const calculateEmergencyFund = (
  monthlyExpenses: number,
  currentSavings: number,
  monthlyIncome: number,
  targetMonths: number = 6
): EmergencyFundPlan => {
  const targetAmount = monthlyExpenses * targetMonths;
  const remainingAmount = Math.max(0, targetAmount - currentSavings);
  const availableForSavings = monthlyIncome * 0.1; // 10% of income for emergency fund
  const monthsToGoal = remainingAmount > 0 ? Math.ceil(remainingAmount / availableForSavings) : 0;
  
  return {
    targetAmount,
    currentAmount: currentSavings,
    monthsToGoal,
    monthlySavingsNeeded: availableForSavings
  };
};

export const calculateDebtPayoff = (
  balance: number,
  interestRate: number,
  monthlyPayment: number
): { monthsToPayoff: number; totalInterest: number; totalPaid: number } => {
  if (monthlyPayment <= (balance * interestRate / 12)) {
    return { monthsToPayoff: Infinity, totalInterest: Infinity, totalPaid: Infinity };
  }
  
  const monthlyRate = interestRate / 12;
  const monthsToPayoff = Math.ceil(
    -Math.log(1 - (balance * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate)
  );
  
  const totalPaid = monthsToPayoff * monthlyPayment;
  const totalInterest = totalPaid - balance;
  
  return { monthsToPayoff, totalInterest, totalPaid };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const extractNumberFromText = (text: string): number | null => {
  const match = text.match(/\$?[\d,]+/);
  if (match) {
    return parseInt(match[0].replace(/[\$,]/g, ''));
  }
  return null;
};