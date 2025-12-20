export interface RegisterGoalContributionRequest {
  goalId: number;
  amount: number;
  date: string;
}

export interface RegisterGoalContributionResponse {
  amount: number;
  date: string;
}
