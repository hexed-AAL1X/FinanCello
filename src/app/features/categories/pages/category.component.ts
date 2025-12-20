import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CategoryService } from '../../../services/Category.service';
import { FinancialMovementService } from '../../../services/FinancialMovement.service';
import { CategorySimpleResponse, CategoryTotalResponse } from '../../../models/Category';
import { TransactionResponse } from '../../../models/FinancialMovement'

interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  totalAmount: number;
  movementCount: number;
}

interface Movement {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'OUTCOME';
  category: string;
  categoryColor: string;
}

@Component({
  selector: 'app-category',
  templateUrl: './category.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  styleUrls: ['./category.component.css']
})
export class CategoryComponent implements OnInit {
  categories: Category[] = [];
  movements: Movement[] = [];
  selectedCategory: number | null = null;
  selectedType: string | null = null;
  isLoading = false;
  userId: number = 0;

  constructor(
    private categoryService: CategoryService,
    private movementService: FinancialMovementService,
    private router: Router
  ) {
    this.getCurrentUserId();
  }

  ngOnInit(): void {
    this.loadData();
  }

  private getCurrentUserId(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.userId = user.id;
    }
  }

  private loadData(): void {
    if (!this.userId) {
      console.error('Usuario no autenticado');
      return;
    }

    this.isLoading = true;
    
    // Cargar categorías del usuario
    this.categoryService.getCategories(this.userId).subscribe({
      next: (categories: CategorySimpleResponse[]) => {
        this.loadCategoriesWithTotals(categories);
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
        this.isLoading = false;
      }
    });

    // Cargar movimientos del usuario
    this.loadMovements();
  }

  private loadCategoriesWithTotals(categories: CategorySimpleResponse[]): void {
    const categoryPromises = categories.map(category => {
      return new Promise<Category>((resolve) => {
        // Obtener total de gastos por categoría
        this.categoryService.getTotalExpensesByCategory(this.userId, category.id).subscribe({
          next: (expenseTotal: CategoryTotalResponse) => {
            // Obtener total de ingresos por categoría
            this.categoryService.getTotalIncomesByCategory(this.userId, category.id).subscribe({
              next: (incomeTotal: CategoryTotalResponse) => {
                const totalAmount = Math.abs(expenseTotal.totalAmount) + Math.abs(incomeTotal.totalAmount);
                
                resolve({
                  id: category.id,
                  name: category.name,
                  description: this.getCategoryDescription(category.name),
                  icon: this.getCategoryIcon(category.name),
                  color: this.getCategoryColor(category.name),
                  totalAmount: totalAmount,
                  movementCount: 0 // Se calculará después
                });
              },
              error: () => {
                resolve({
                  id: category.id,
                  name: category.name,
                  description: this.getCategoryDescription(category.name),
                  icon: this.getCategoryIcon(category.name),
                  color: this.getCategoryColor(category.name),
                  totalAmount: Math.abs(expenseTotal.totalAmount),
                  movementCount: 0
                });
              }
            });
          },
          error: () => {
            // Si no hay gastos, intentar solo ingresos
            this.categoryService.getTotalIncomesByCategory(this.userId, category.id).subscribe({
              next: (incomeTotal: CategoryTotalResponse) => {
                resolve({
                  id: category.id,
                  name: category.name,
                  description: this.getCategoryDescription(category.name),
                  icon: this.getCategoryIcon(category.name),
                  color: this.getCategoryColor(category.name),
                  totalAmount: Math.abs(incomeTotal.totalAmount),
                  movementCount: 0
                });
              },
              error: () => {
                resolve({
                  id: category.id,
                  name: category.name,
                  description: this.getCategoryDescription(category.name),
                  icon: this.getCategoryIcon(category.name),
                  color: this.getCategoryColor(category.name),
                  totalAmount: 0,
                  movementCount: 0
                });
              }
            });
          }
        });
      });
    });

    Promise.all(categoryPromises).then(categoriesWithTotals => {
      this.categories = categoriesWithTotals;
      this.calculateMovementCounts();
      this.isLoading = false;
    });
  }

  private loadMovements(): void {
    this.movementService.getMovements(this.userId).subscribe({
      next: (movements: TransactionResponse[]) => {
        this.movements = movements.map(movement => ({
          id: 0, // El backend no proporciona ID individual
          date: movement.date,
          description: movement.movementName,
          amount: movement.amount,
          type: movement.movementName === 'INCOME' ? 'INCOME' : 'OUTCOME',
          category: movement.categoryName,
          categoryColor: this.getCategoryColor(movement.categoryName)
        }));
      },
      error: (error) => {
        console.error('Error cargando movimientos:', error);
        this.movements = [];
      }
    });
  }

  private calculateMovementCounts(): void {
    this.categories.forEach(category => {
      const count = this.movements.filter(movement => 
        movement.category === category.name
      ).length;
      category.movementCount = count;
    });
  }

  onCategorySelect(categoryId: number | null): void {
    this.selectedCategory = categoryId;
  }

  onTypeSelect(type: string | null): void {
    this.selectedType = type;
  }

  onAddCategory(): void {
    this.router.navigate(['dashboard/settings/categories']);
  }

  onEditCategory(category: Category): void {
    // Navegar al formulario de categorías con el modo de edición
    this.router.navigate(['dashboard/settings/categories'], {
      queryParams: { 
        action: 'edit',
        categoryId: category.id,
        categoryName: category.name
      }
    });
  }

  onDeleteCategory(category: Category): void {
    // Confirmar antes de eliminar
    if (confirm(`¿Estás seguro de que quieres eliminar la categoría "${category.name}"?`)) {
      // Navegar al formulario de categorías con el modo de eliminación
      this.router.navigate(['dashboard/settings/categories'], {
        queryParams: { 
          action: 'delete',
          categoryId: category.id,
          categoryName: category.name
        }
      });
    }
  }

  onRefreshData(): void {
    this.loadData();
  }

  // Método para recargar datos cuando se regresa del formulario
  onReturnFromForm(): void {
    this.loadData();
  }

  getFilteredMovements(): Movement[] {
    let filtered = this.movements;

    if (this.selectedCategory) {
      const categoryName = this.categories.find(c => c.id === this.selectedCategory)?.name;
      filtered = filtered.filter(m => m.category === categoryName);
    }

    if (this.selectedType) {
      filtered = filtered.filter(m => m.type === this.selectedType);
    }

    return filtered;
  }

  getTotalByType(type: string): number {
    return this.getFilteredMovements()
      .filter(m => m.type === type)
      .reduce((total, m) => total + Math.abs(m.amount), 0);
  }

  getTotalMovements(): number {
    return this.getFilteredMovements().length;
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-PE');
  }



  getCategoryDescription(categoryName: string): string {
    const descriptions: { [key: string]: string } = {
      'Alimentación': 'Gastos en comida y bebidas',
      'Transporte': 'Combustible, transporte público',
      'Vivienda': 'Alquiler, servicios, mantenimiento',
      'Salud': 'Médicos, medicamentos, seguros',
      'Entretenimiento': 'Cine, restaurantes, hobbies',
      'Educación': 'Cursos, libros, materiales',
      'Ropa': 'Vestimenta y accesorios',
      'Servicios': 'Internet, telefonía, streaming',
      'Ingresos': 'Salarios, bonificaciones, otros ingresos',
      'Otros': 'Gastos varios y emergencias'
    };
    return descriptions[categoryName] || 'Categoría personalizada';
  }

  getCategoryIcon(categoryName: string): string {
    const icons: { [key: string]: string } = {
      'Alimentación': '🍽️',
      'Transporte': '🚗',
      'Vivienda': '🏠',
      'Salud': '🏥',
      'Entretenimiento': '🎮',
      'Educación': '📚',
      'Ropa': '👕',
      'Servicios': '📱',
      'Ingresos': '💰',
      'Otros': '📊'
    };
    return icons[categoryName] || '📊';
  }

  getCategoryColorByName(categoryName: string): string {
    const colors: { [key: string]: string } = {
      'Alimentación': '#10b981',
      'Transporte': '#3b82f6',
      'Vivienda': '#f59e0b',
      'Salud': '#ef4444',
      'Entretenimiento': '#8b5cf6',
      'Educación': '#06b6d4',
      'Ropa': '#ec4899',
      'Servicios': '#6366f1',
      'Ingresos': '#10b981',
      'Otros': '#6b7280'
    };
    return colors[categoryName] || '#6b7280';
  }

  getCategoryColor(categoryName: string): string {
    const category = this.categories.find(c => c.name === categoryName);
    return category?.color || this.getCategoryColorByName(categoryName);
  }

  Math = Math;
}
