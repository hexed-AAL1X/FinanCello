export interface AddSavingGoalRequest {
  name: string;
  targetAmount: number;
  dueDate: string;
}

export interface UpdateSavingGoalRequest {
  name?: string;
  targetAmount?: number;
  dueDate?: string;
}

export interface AddSavingGoalResponse {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  dueDate: string;
  userId: number;
}

export interface GoalContributionResponse {
  contributionId: number;
  amount: number;
  date: string;
}

export interface UserGoalsWithContributionsResponse {
  goalId: number;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  dueDate: string;
  progress: string;
  contributions: GoalContributionResponse[];
}