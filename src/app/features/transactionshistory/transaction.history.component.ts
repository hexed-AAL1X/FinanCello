import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FinancialMovementService } from '../../services/FinancialMovement.service';
import { TransactionResponse } from '../../models/FinancialMovement';
import { PdfService } from '../finances/Pdf.service';

interface Transaction {
  id: number;
  name: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  date: Date;
  time: string;
  meta: string;
  goal?: string;
  icon?: string;
}

type SortOrder = 'asc' | 'desc' | null;
type FilterType = 'all' | 'income' | 'expense';

@Component({
  selector: 'app-transaction-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './transaction.history.component.html',
  styleUrls: ['./transaction.history.component.css']
})
export class TransactionHistoryComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  allTransactions: Transaction[] = [];
  displayedTransactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  currentPage = 1;
  totalPages = 1;
  totalTransactions = 0;
  pageSize = 8;
  private userId: number = 0;

  // Sort and filter properties
  currentSortOrder: SortOrder = null;
  currentFilter: FilterType = 'all';
  availableCategories: string[] = [];
  selectedCategory: string = 'all';

  // UI state
  showSortMenu = false;
  showFilterMenu = false;

  constructor(
    private http: HttpClient,
    private financialMovementService: FinancialMovementService,
    private pdfService: PdfService
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      this.showSortMenu = false;
      this.showFilterMenu = false;
    }
  }

  ngOnInit(): void {
    this.getCurrentUserId();
    this.loadTransactions();
  }


  loadTestData(count: number = 20): void {
    this.isLoading = true;
    this.errorMessage = '';


    setTimeout(() => {
      this.allTransactions = this.generateSampleTransactions(count);
      this.updateAvailableCategories();
      this.applyFiltersAndSort();
      this.isLoading = false;
      console.log(`Generated ${count} sample transactions for testing`);
    }, 500);
  }

  private getCurrentUserId(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.userId = user.id;
    } else {
      this.errorMessage = 'No se encontró información del usuario';
      this.isLoading = false;
    }
  }

// In transaction.history.component.ts
  loadTransactions(): void {
    if (!this.userId) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;

    // Subscribe to the shared state
    this.financialMovementService.getTransactions().subscribe({
      next: (response: TransactionResponse[]) => {
        this.allTransactions = this.mapTransactionResponseToTransaction(response);
        this.updateAvailableCategories();
        this.applyFiltersAndSort();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading transactions:', error);
        this.errorMessage = 'Error al cargar las transacciones';
        this.isLoading = false;
        this.loadSampleData();
      }
    });

    // Refresh the data from the API
    this.financialMovementService.refreshTransactions(this.userId).subscribe({
      error: (error) => {
        console.error('Error refreshing transactions:', error);
      }
    });
  }
  updateAvailableCategories(): void {
    const categories = [...new Set(this.allTransactions.map(t => t.category))];
    this.availableCategories = categories.sort();
  }

  applyFiltersAndSort(): void {
    this.filteredTransactions = this.allTransactions.filter(transaction => {
      const typeMatch = this.currentFilter === 'all' || transaction.type === this.currentFilter;
      const categoryMatch = this.selectedCategory === 'all' || transaction.category === this.selectedCategory;
      return typeMatch && categoryMatch;
    });

    if (this.currentSortOrder) {
      this.filteredTransactions.sort((a, b) => {
        if (this.currentSortOrder === 'asc') {
          return a.amount - b.amount;
        } else {
          return b.amount - a.amount;
        }
      });
    }

    this.totalTransactions = this.filteredTransactions.length;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.totalTransactions / this.pageSize);
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    if (this.currentPage < 1) this.currentPage = 1;

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedTransactions = this.filteredTransactions.slice(startIndex, endIndex);
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize = parseInt(select.value);
    this.currentPage = 1; // Reset to first page when changing page size
    this.updatePagination();
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  getPaginationInfo(): string {
    const startIndex = (this.currentPage - 1) * this.pageSize + 1;
    const endIndex = Math.min(this.currentPage * this.pageSize, this.totalTransactions);
    return `${startIndex}-${endIndex} of ${this.totalTransactions}`;
  }

  // Sort functionality
  toggleSortMenu(): void {
    this.showSortMenu = !this.showSortMenu;
    this.showFilterMenu = false;
  }

  sortByAmount(order: SortOrder): void {
    this.currentSortOrder = order;
    this.showSortMenu = false;
    this.currentPage = 1; // Reset to first page when sorting
    this.applyFiltersAndSort();
  }

  getSortButtonText(): string {
    if (this.currentSortOrder === 'asc') return 'Sort: Low to High';
    if (this.currentSortOrder === 'desc') return 'Sort: High to Low';
    return 'Sort';
  }

  // Filter functionality
  toggleFilterMenu(): void {
    this.showFilterMenu = !this.showFilterMenu;
    this.showSortMenu = false;
  }

  filterByType(type: FilterType): void {
    this.currentFilter = type;
    this.currentPage = 1;
    this.applyFiltersAndSort();
  }

  filterByCategory(category: string): void {
    this.selectedCategory = category;
    this.currentPage = 1;
    this.applyFiltersAndSort();
  }

  getFilterButtonText(): string {
    const filters = [];
    if (this.currentFilter !== 'all') filters.push(this.currentFilter);
    if (this.selectedCategory !== 'all') filters.push(this.selectedCategory);
    return filters.length > 0 ? `Filter: ${filters.join(', ')}` : 'Filter';
  }

  clearFilters(): void {
    this.currentFilter = 'all';
    this.selectedCategory = 'all';
    this.currentPage = 1;
    this.applyFiltersAndSort();
  }

  private mapTransactionResponseToTransaction(response: TransactionResponse[]): Transaction[] {
    return response.map((item, index) => ({
      id: index + 1,
      name: item.movementName,
      category: item.categoryName,
      amount: item.amount,
      type: this.determineTransactionType(item.movementName), // Puedes ajustar esta lógica
      date: new Date(item.date),
      time: this.formatTime(new Date(item.date)),
      meta: `Moneda: ${item.currencyName}`,
      icon: '/assets/icons/piggy-bank.png'
    }));
  }

  private determineTransactionType(movementName: string): 'income' | 'expense' {
    // Lógica simple para determinar el tipo basado en el nombre
    // En un caso real, esto vendría del backend
    const incomeKeywords = ['ingreso', 'income', 'salary', 'payment', 'revenue'];
    const hasIncomeKeyword = incomeKeywords.some(keyword =>
      movementName.toLowerCase().includes(keyword)
    );
    return hasIncomeKeyword ? 'income' : 'expense';
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  private loadSampleData(): void {
    this.allTransactions = this.generateSampleTransactions(15);
    this.updateAvailableCategories();
    this.applyFiltersAndSort();
  }


  private generateSampleTransactions(count: number = 20): Transaction[] {
    const categories = ['Food', 'Transportation', 'Entertainment', 'Housing', 'Utilities', 'Healthcare', 'Education', 'Shopping', 'Travel', 'Investments'];
    const incomeNames = ['Salary payment', 'Freelance work', 'Investment return', 'Client payment', 'Consulting fee', 'Dividend income', 'Rental income', 'Bonus payment', 'Tax refund', 'Gift received'];
    const expenseNames = ['Grocery shopping', 'Restaurant bill', 'Utility payment', 'Rent payment', 'Car maintenance', 'Medical expense', 'Online purchase', 'Subscription fee', 'Transportation cost', 'Home repair'];
    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'];

    const transactions: Transaction[] = [];
    const today = new Date();

    for (let i = 1; i <= count; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const transactionDate = new Date(today);
      transactionDate.setDate(today.getDate() - daysAgo);


      const hours = Math.floor(Math.random() * 24);
      const minutes = Math.floor(Math.random() * 60);
      transactionDate.setHours(hours, minutes);

      const type = Math.random() < 0.6 ? 'expense' : 'income';

      const category = categories[Math.floor(Math.random() * categories.length)];


      const name = type === 'income'
        ? incomeNames[Math.floor(Math.random() * incomeNames.length)]
        : expenseNames[Math.floor(Math.random() * expenseNames.length)];

      const baseAmount = type === 'income'
        ? 500 + Math.random() * 2000
        : 10 + Math.random() * 200;
      const amount = parseFloat(baseAmount.toFixed(2));
      const currency = currencies[Math.floor(Math.random() * currencies.length)];

      transactions.push({
        id: i,
        name,
        category,
        amount,
        type,
        date: transactionDate,
        time: this.formatTime(transactionDate),
        meta: `Moneda: ${currency}`,
        icon: type === 'income'
          ? '/assets/icons/money-green.png'
          : '/assets/icons/money-red.png',
        goal: Math.random() < 0.3 ? `Goal: ${Math.floor(amount * 1.5)}` : undefined
      });
    }
    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  trackByTransaction(index: number, transaction: Transaction): number {
    return transaction.id;
  }

  exportToPdf(): void {
    const transactionResponses: TransactionResponse[] = this.filteredTransactions.map(transaction => ({
      amount: transaction.amount,
      currencyName: transaction.meta.replace('Moneda: ', ''),
      date: transaction.date.toISOString(),
      movementName: transaction.type === 'income' ? 'INCOME' : 'OUTCOME',
      categoryName: transaction.category
    }));

    this.pdfService.generateTransactionsPdf(transactionResponses);
  }
}
