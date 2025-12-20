export interface SpendingLimitRequest {
  categoryId: number;
  monthlyLimit: number;
  userId: number;
}

export interface SpendingLimitResponse {
  categoryName: string;
  monthlyLimit: number;
}

export interface SpendingLimitAlertResponse {
  categoryName: string;
  monthlyLimit: number;
  totalSpent: number;
  overLimit: boolean;
  alertMessage: string;
}
