export interface BudgetRequest {
  userId: number;
  period: string;
  totalIncomePlanned: number;
  totalOutcomePlanned: number;
}

export interface BudgetResponse {
  id: number;
  period: string;
  totalIncomePlanned: number;
  totalOutcomePlanned: number;
  userId: number; // o, si prefieres, sólo userId: number
}
