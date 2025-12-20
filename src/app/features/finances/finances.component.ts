import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CategoryService } from '../../services/Category.service';
import { FinancialMovementService } from '../../services/FinancialMovement.service';
import { AuthResponse } from '../../models/User';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { PdfService } from './Pdf.service';
import { CategorySimpleResponse } from '../../models/Category';
import { TransactionResponse } from '../../models/FinancialMovement';
import { Chart, ChartConfiguration, ChartData, ChartType } from 'chart.js';

// Extended interface to include amount property
interface CategoryWithAmount extends CategorySimpleResponse {
  amount?: number;
  checked?: boolean;
}

@Component({
  selector: 'app-finances',
  standalone: true,
  templateUrl: './finances.component.html',
  styleUrls: ['./finances.component.css'],
  imports: [CommonModule, RouterModule]
})
export class FinancesComponent implements OnInit, AfterViewInit {
  user!: AuthResponse;
  categories: CategoryWithAmount[] = [];
  transactions: TransactionResponse[] = [];

  // Chart properties
  @ViewChild('transactionsChart') transactionsChartRef!: ElementRef;
  @ViewChild('categoriesChart') categoriesChartRef!: ElementRef;
  
  transactionsChart!: Chart;
  categoriesChart!: Chart;

  // Chart configurations
  transactionsChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Income',
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        data: [],
        label: 'Expenses',
        borderColor: '#F44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  categoriesChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
          '#FF6384',
          '#C9CBCF'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  transactionsChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      title: {
        display: true,
        text: 'Income vs Expenses'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value;
          }
        }
      }
    }
  };

  categoriesChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right'
      },
      title: {
        display: true,
        text: 'Categories Distribution'
      }
    }
  };

  constructor(
    private categoryService: CategoryService,
    private financialMovementService: FinancialMovementService,
    private pdfService: PdfService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      this.user = JSON.parse(storedUser);
      this.loadCategories();
      this.loadTransactions();
    } else {
      console.error('No user found in localStorage');
    }
  }

  ngAfterViewInit(): void {
    this.initializeCharts();
  }

  initializeCharts(): void {
    // Initialize transactions chart
    const transactionsCtx = this.transactionsChartRef?.nativeElement?.getContext('2d');
    if (transactionsCtx) {
      this.transactionsChart = new Chart(transactionsCtx, {
        type: 'line',
        data: this.transactionsChartData,
        options: this.transactionsChartOptions
      });
    }

    // Initialize categories chart
    const categoriesCtx = this.categoriesChartRef?.nativeElement?.getContext('2d');
    if (categoriesCtx) {
      this.categoriesChart = new Chart(categoriesCtx, {
        type: 'doughnut',
        data: this.categoriesChartData,
        options: this.categoriesChartOptions
      });
    }
  }

  updateTransactionsChart(): void {
    if (!this.transactionsChart) return;

    // Group transactions by date and type
    const incomeByDate = new Map<string, number>();
    const expensesByDate = new Map<string, number>();

    this.transactions.forEach(transaction => {
      const date = new Date(transaction.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      const amount = transaction.amount || 0;

      if (transaction.movementName?.toUpperCase() === 'INCOME') {
        incomeByDate.set(date, (incomeByDate.get(date) || 0) + amount);
      } else {
        expensesByDate.set(date, (expensesByDate.get(date) || 0) + amount);
      }
    });

    // Get all unique dates
    const allDates = [...new Set([...incomeByDate.keys(), ...expensesByDate.keys()])].sort();

    // Update chart data
    this.transactionsChart.data.labels = allDates;
    this.transactionsChart.data.datasets[0].data = allDates.map(date => incomeByDate.get(date) || 0);
    this.transactionsChart.data.datasets[1].data = allDates.map(date => expensesByDate.get(date) || 0);

    this.transactionsChart.update();
  }

  updateCategoriesChart(): void {
    if (!this.categoriesChart) return;

    // Filter categories that are checked and have amounts > 0
    const checkedCategoriesWithAmounts = this.categories.filter(cat => 
      cat.checked && (cat.amount || 0) > 0
    );

    // Update chart data
    this.categoriesChart.data.labels = checkedCategoriesWithAmounts.map(cat => cat.name);
    this.categoriesChart.data.datasets[0].data = checkedCategoriesWithAmounts.map(cat => cat.amount || 0);

    this.categoriesChart.update();
  }

  loadCategories(): void {
    console.log('Loading categories for user ID:', this.user.id);
    this.categoryService.getCategories(this.user.id).subscribe({
      next: (data) => {
        console.log('Categories loaded from backend:', data);

        // Make a copy of the data and initialize amounts to 0 and checked to false
        this.categories = data.map(cat => ({
          ...cat,
          amount: 0,
          checked: true // Mark all categories as checked by default
        }));

        console.log('Initialized categories with zero amounts:', this.categories);

        // Cargar montos por cada categoría
        this.categories.forEach((cat) => {
          console.log('Loading total expenses and incomes for category:', cat.name, 'with ID:', cat.id);

          // Load expenses
          this.categoryService
            .getTotalExpensesByCategory(this.user.id, cat.id)
            .subscribe({
              next: (expenseResponse) => {
                console.log('Total expenses for category', cat.name, ':', expenseResponse);
                // Find the category in the array and update its amount
                const categoryIndex = this.categories.findIndex(c => c.id === cat.id);
                if (categoryIndex !== -1) {
                  this.categories[categoryIndex].amount =
                    (this.categories[categoryIndex].amount || 0) +
                    (expenseResponse.totalAmount || 0);
                  console.log('Updated category with expense amount:', this.categories[categoryIndex]);
                  this.updateCategoriesChart();
                }
              },
              error: (err) => {
                console.error(`Error loading expenses for category ${cat.name}`, err);
              },
            });

          // Load incomes
          this.categoryService
            .getTotalIncomesByCategory(this.user.id, cat.id)
            .subscribe({
              next: (incomeResponse) => {
                console.log('Total incomes for category', cat.name, ':', incomeResponse);
                // Find the category in the array and update its amount
                const categoryIndex = this.categories.findIndex(c => c.id === cat.id);
                if (categoryIndex !== -1) {
                  this.categories[categoryIndex].amount =
                    (this.categories[categoryIndex].amount || 0) +
                    (incomeResponse.totalAmount || 0);
                  console.log('Updated category with income amount:', this.categories[categoryIndex]);
                  this.updateCategoriesChart();
                }
              },
              error: (err) => {
                console.error(`Error loading incomes for category ${cat.name}`, err);
              },
            });
        });
      },
      error: (err) => {
        console.error('Error loading categories', err);
      },
    });
  }

  loadTransactions(): void {
    console.log('Loading transactions from shared state...');

    // First, subscribe to the shared state
    this.financialMovementService.getTransactions().subscribe({
      next: (data) => {
        console.log('Transactions received from shared state:', data);
        this.transactions = data
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);
        this.updateTransactionsChart();
      }
    });

    // Then, refresh the data from the API
    this.financialMovementService.refreshTransactions(this.user.id).subscribe({
      error: (err) => {
        console.error('Error refreshing transactions', err);
      }
    });
  }

  downloadTransactionsPdf(): void {
    this.pdfService.generateTransactionsPdf(this.transactions);
  }

  toggleCheck(event: MouseEvent, index: number) {
    const checkbox = (event.currentTarget as HTMLElement);
    checkbox.classList.toggle('checked');
    
    // Update the category's checked state
    if (index >= 0 && index < this.categories.length) {
      this.categories[index].checked = !this.categories[index].checked;
      this.updateCategoriesChart();
    }
  }

  navigateToTransactions(): void {
    this.router.navigate(['/dashboard/transactions']);
  }

  navigateToCategories(): void {
    this.router.navigate(['/dashboard/categories']);
  }
}
