import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../services/Auth.service';
import { FinancialMovementService } from '../services/FinancialMovement.service';
import { SavingGoalService } from '../services/SavingGoal.service';
import { GoalContributionService } from '../services/GoalContribution.service';
import { TransactionResponse } from '../models/FinancialMovement';
import { AddSavingGoalResponse } from '../models/SavingGoal';
import { UserProfileResponse } from '../models/User';

interface RecentTransaction {
  title: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  date: Date;
}

interface GoalDisplay {
  title: string;
  description: string;
  currentAmount: number;
  targetAmount: number;
  progress: number;
}

interface FinancialStats {
  totalIncome: number;
  totalExpenses: number;
  currentBalance: number;
  totalSavings: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  userInfo: any;
  currentDate = new Date();
  isLoading = true;
  isLoadingGoals = true;
  isLoadingStats = true;

  // Financial statistics
  financialStats: FinancialStats = {
    totalIncome: 0,
    totalExpenses: 0,
    currentBalance: 0,
    totalSavings: 0
  };

  // Recent transactions
  recentTransactions: RecentTransaction[] = [];

  // Recent goals
  recentGoals: GoalDisplay[] = [];

  constructor(
    private authService: AuthService,
    private financialMovementService: FinancialMovementService,
    private savingGoalService: SavingGoalService,
    private goalContributionService: GoalContributionService,
    private router: Router
  ) {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.userInfo = JSON.parse(userStr);
      console.log(this.userInfo);
    }
  }

  ngOnInit(): void {
    this.loadRecentTransactions();
    this.loadRecentGoals();
    this.loadFinancialStats();
  }

  loadFinancialStats(): void {
    if (!this.userInfo?.id) {
      this.isLoadingStats = false;
      return;
    }

    // Load all movements to calculate stats
    this.financialMovementService.getMovements(this.userInfo.id).subscribe({
      next: (movements: TransactionResponse[]) => {
        console.log('All movements for stats:', movements);
        
        // Calculate income and expenses
        let totalIncome = 0;
        let totalExpenses = 0;
        
        movements.forEach(movement => {
          const isIncome = this.determineTransactionType(movement.movementName) === 'income';
          if (isIncome) {
            totalIncome += movement.amount;
          } else {
            totalExpenses += movement.amount;
          }
        });

        this.financialStats.totalIncome = totalIncome;
        this.financialStats.totalExpenses = totalExpenses;
        this.financialStats.currentBalance = totalIncome - totalExpenses;

        // Load savings from goal contributions
        this.loadTotalSavings();
      },
      error: (error) => {
        console.error('Error loading financial stats:', error);
        this.isLoadingStats = false;
      }
    });
  }

  loadTotalSavings(): void {
    // First get all goals to calculate total savings
    this.savingGoalService.listSavingGoals().subscribe({
      next: (goals: AddSavingGoalResponse[]) => {
        console.log('Goals for savings calculation:', goals);
        
        if (goals.length === 0) {
          this.financialStats.totalSavings = 0;
          this.isLoadingStats = false;
          return;
        }

        // Calculate total savings from current amounts of all goals
        const totalSavings = goals.reduce((total, goal) => total + goal.currentAmount, 0);
        this.financialStats.totalSavings = totalSavings;
        this.isLoadingStats = false;
        
        console.log('Financial stats calculated:', this.financialStats);
      },
      error: (error) => {
        console.error('Error loading savings:', error);
        this.financialStats.totalSavings = 0;
        this.isLoadingStats = false;
      }
    });
  }

  // Helper method to format balance with negative sign
  formatBalance(amount: number): string {
    if (amount < 0) {
      return `-${Math.abs(amount).toLocaleString('es-ES', { style: 'currency', currency: 'USD' })}`;
    }
    return amount.toLocaleString('es-ES', { style: 'currency', currency: 'USD' });
  }

  loadRecentTransactions(): void {
    if (!this.userInfo?.id) {
      this.isLoading = false;
      return;
    }

    this.financialMovementService.getMovements(this.userInfo.id).subscribe({
      next: (response: TransactionResponse[]) => {
        // Tomar solo las 4 transacciones más recientes
        console.log(response);
        const sortedTransactions = response
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 4);
        console.log(sortedTransactions);
        this.recentTransactions = sortedTransactions.map(transaction => ({
          title: transaction.movementName,
          category: transaction.categoryName,
          amount: transaction.amount,
          type: this.determineTransactionType(transaction.movementName),
          date: this.parseDateCorrectly(transaction.date)
        }));
        console.log(this.recentTransactions);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading recent transactions:', error);
        this.isLoading = false;
      }
    });
  }

  private determineTransactionType(movementName: string): 'income' | 'expense' {
    const incomeKeywords = ['ingreso', 'income', 'salary', 'payment', 'revenue', 'salario', 'freelance'];
    const hasIncomeKeyword = incomeKeywords.some(keyword => 
      movementName.toLowerCase().includes(keyword)
    );
    return hasIncomeKeyword ? 'income' : 'expense';
  }

  formatDate(date: Date): string {
    const now = new Date();
    const transactionDate = new Date(date);
    
    // Resetear las horas para comparar solo fechas
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const transDate = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
    
    const diffTime = today.getTime() - transDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Hoy, ' + transactionDate.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffDays === 1) {
      return 'Ayer, ' + transactionDate.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffDays > 1 && diffDays <= 7) {
      return `${diffDays} días atrás`;
    } else {
      return transactionDate.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  }

  private parseDateCorrectly(dateStr: string): Date {
    // Si la fecha viene sin tiempo, agregar 00:00
    if (!dateStr.includes('T')) {
      dateStr = dateStr + 'T00:00:00';
    }
    
    // Crear la fecha en la zona horaria local
    const date = new Date(dateStr);
    
    // Asegurar que se interprete como fecha local
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    return new Date(year, month, day, hours, minutes);
  }

  loadRecentGoals(): void {
    if (!this.userInfo?.id) {
      this.isLoadingGoals = false;
      return;
    }

    this.savingGoalService.listSavingGoals().subscribe({
      next: (response: AddSavingGoalResponse[]) => {
        console.log('Goals response:', response);
        
        // Sort by creation date (assuming newer goals have higher IDs) and take the 4 most recent
        const sortedGoals = response
          .sort((a, b) => b.id - a.id)
          .slice(0, 4);
        
        this.recentGoals = sortedGoals.map(goal => ({
          title: goal.name,
          description: `Meta de ahorro`,
          currentAmount: goal.currentAmount,
          targetAmount: goal.targetAmount,
          progress: goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0
        }));
        
        console.log('Recent goals:', this.recentGoals);
        this.isLoadingGoals = false;
      },
      error: (error) => {
        console.error('Error loading recent goals:', error);
        this.recentGoals = [];
        this.isLoadingGoals = false;
      }
    });
  }

  // Métodos para acciones rápidas
  goToAddMovement() {
    this.router.navigate(['/dashboard/finances/addmovement']);
  }

  goToAddCategory() {
    this.router.navigate(['/dashboard/settings/categories']);
  }

  goToAddGoal() {
    this.router.navigate(['/dashboard/savinggoals/new']);
  }

  goToReports() {
    this.router.navigate(['/dashboard/transactions']);
  }
}