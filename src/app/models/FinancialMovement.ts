import { CategoryResponse } from './Category';

export interface RegisterFinancialMovementRequest {
  amount: number;
  date: string;            // LocalDate en Java → ISO string
  movementType: string;    // MovementType enum → string
  categoryId: number;
  currencyType: string;    // CurrencyType enum → string
}

export interface RegisterFinancialMovementResponse {
  amount: number;
  date: string;
  movementType: string;
  categoryResponse: CategoryResponse;
  currencyType: string;
}

export interface TransactionResponse {
  amount: number;
  currencyName: string;
  date: string;
  movementName: string;
  categoryName: string;
}

export interface RecentMovementResponse {
  movementId: number;
  amount: number;
  date: string; // ISO string, se puede convertir a Date en el frontend si lo necesitas
  categoryName: string;
  categoryDescription: string;
  movementType: 'INCOME' | 'OUTCOME';
}