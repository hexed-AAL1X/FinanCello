import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FinancialMovementService } from '../../../services/FinancialMovement.service';
import { CategoryService } from '../../../services/Category.service';
import { RegisterFinancialMovementRequest } from '../../../models/FinancialMovement';
import { AuthResponse } from '../../../models/User';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SnackbarService } from '../../../shared/layout/snackbar/snackbar.service';
import { SpendingLimitService } from '../../../services/SpendingLimit.service';
import { SpendingLimitAlertResponse } from '../../../models/SpendingLimit';

@Component({
  selector: 'app-addmovement',
  standalone: true,
  templateUrl: './addmovement.component.html',
  styleUrls: ['./addmovement.component.css'],
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class AddMovementComponent implements OnInit {

  movementForm!: FormGroup;
  user!: AuthResponse;
  categories: any[] = [];
  movementTypes: string[] = ['INCOME', 'OUTCOME'];
  currencyTypes: string[] = ['PEN', 'USD', 'EUR']; // Podés ajustar esto según tus enums
  
  // Alert properties
  showLimitAlert = false;
  limitAlert: SpendingLimitAlertResponse | null = null;
  newAmount = 0;
  isProcessing = false;

  constructor(
    private fb: FormBuilder,
    private movementService: FinancialMovementService,
    private categoryService: CategoryService,
    private router: Router,
    private snackbar: SnackbarService,
    private spendingLimitService: SpendingLimitService
  ) {}

  ngOnInit(): void {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      this.snackbar.showSnackbar('Error', 'No se encontró usuario autenticado', 'assets/icons/error.png', true);
      return;
    }

    this.user = JSON.parse(storedUser);

    this.initForm();
    this.loadCategories();
  }

  initForm(): void {
    this.movementForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(0.01)]],
      date: [null, Validators.required],
      movementType: ['INCOME', Validators.required],
      categoryId: [null, Validators.required],
      currencyType: ['PEN', Validators.required]
    });
  }

  loadCategories(): void {
    this.categoryService.getCategories(this.user.id).subscribe({
      next: (data) => {
        this.categories = data;
      },
      error: (err) => {
        this.snackbar.showSnackbar('Error', 'No se pudieron cargar las categorías', 'assets/icons/error.png', true);
      }
    });
  }

  submit(): void {
    if (this.movementForm.invalid) {
      this.snackbar.showSnackbar('Formulario inválido', 'Completa los datos faltantes', 'assets/icons/warning.png', true);
      this.movementForm.markAllAsTouched();
      return;
    }

    const movement: RegisterFinancialMovementRequest = {
      ...this.movementForm.value
    };

    // Validar límite solo para OUTCOME
    if (movement.movementType === 'OUTCOME') {
      this.validateSpendingLimit(movement);
    } else {
      this.registerMovement(movement);
    }
  }

  private validateSpendingLimit(movement: RegisterFinancialMovementRequest): void {
    this.isProcessing = true;
    
    this.spendingLimitService.getSpendingLimitAlerts(this.user.id).subscribe({
      next: (alerts) => {
        const selectedCategory = this.categories.find(c => c.id === movement.categoryId);
        const alert = alerts.find(a => a.categoryName === selectedCategory?.name);
        
        if (alert && alert.overLimit) {
          // Calcular el nuevo monto total si se agrega este movimiento
          this.newAmount = alert.totalSpent + movement.amount;
          this.limitAlert = alert;
          this.showLimitAlert = true;
          this.isProcessing = false;
        } else {
          // No hay límite o no se excede, proceder normalmente
          this.registerMovement(movement);
        }
      },
      error: () => {
        this.snackbar.showSnackbar('Error', 'No se pudo validar el límite de gasto', 'assets/icons/error.png', true);
        this.isProcessing = false;
      }
    });
  }

  private registerMovement(movement: RegisterFinancialMovementRequest) {
    this.isProcessing = true;
    
    this.movementService.register(this.user.id, movement).subscribe({
      next: () => {
        this.snackbar.showSnackbar('Éxito', 'Movimiento registrado correctamente', 'assets/icons/success.png', true);
        this.router.navigate(['/finances']);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al registrar el movimiento';
        this.snackbar.showSnackbar('Error', msg, 'assets/icons/error.png', true);
        this.isProcessing = false;
      }
    });
  }

  // Métodos para manejar la alerta de límite
  onContinueWithLimit(): void {
    if (this.limitAlert) {
      const movement: RegisterFinancialMovementRequest = {
        ...this.movementForm.value
      };
      
      this.showLimitAlert = false;
      this.limitAlert = null;
      this.registerMovement(movement);
    }
  }

  onCancelLimit(): void {
    this.showLimitAlert = false;
    this.limitAlert = null;
    this.isProcessing = false;
  }

  getExceededAmount(): number {
    if (this.limitAlert && this.newAmount) {
      return Math.max(this.newAmount - this.limitAlert.monthlyLimit, 0);
    }
    return 0;
  }

  getNewPercentage(): number {
    if (this.limitAlert && this.newAmount) {
      return Math.min((this.newAmount / this.limitAlert.monthlyLimit) * 100, 150);
    }
    return 0;
  }

  getAlertSeverity(): string {
    if (!this.limitAlert) return 'low';
    
    const percentage = (this.newAmount / this.limitAlert.monthlyLimit) * 100;
    if (percentage >= 150) return 'critical';
    if (percentage >= 120) return 'high';
    if (percentage >= 100) return 'medium';
    return 'low';
  }

  getAlertIcon(): string {
    const severity = this.getAlertSeverity();
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      default: return '💡';
    }
  }

  getAlertColor(): string {
    const severity = this.getAlertSeverity();
    switch (severity) {
      case 'critical': return '#ff0000';
      case 'high': return '#ff6600';
      case 'medium': return '#ffaa00';
      default: return '#0EA49B';
    }
  }
}
