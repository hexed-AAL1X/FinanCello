import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { SpendingLimitService } from  '../../../../services/SpendingLimit.service';
import { CategoryService } from '../../../../services/Category.service';
import {SpendingLimitRequest, SpendingLimitResponse} from '../../../../models/SpendingLimit';
import { SnackbarService } from '../../../../shared/layout/snackbar/snackbar.service';
import { RouterModule } from '@angular/router';
import { AuthResponse } from '../../../../models/User';

@Component({
  selector: 'app-spending-limit-form',
  standalone: true,
  templateUrl: './spending-limit-form.component.html',
  styleUrls: ['./spending-limit-form.component.css'],
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
})
export class SpendingLimitFormComponent implements OnInit {
  limitForm!: FormGroup;
  categories: any[] = [];
  limits: SpendingLimitResponse[] = [];
  user!: AuthResponse;
  createdLimit: SpendingLimitResponse | null = null;

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private spendingLimitService: SpendingLimitService,
    private snackbarService: SnackbarService,
  ) {}

  mode: "delete" | "list" | "create" = 'create';

  ngOnInit(): void {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      console.error('No user found');
      return;
    }

    this.user = JSON.parse(storedUser);

    this.initForm();
    this.loadCategories();
    this.loadLimits()

  }

  switchMode(m: 'delete' | 'list' | 'create'): void {
    console.log(' switchMode llamado con:', m);
    this.mode = m;
    if (m === 'list') {
      this.loadLimits();
    }
  }


  list(): void {
    this.loadLimits();
    this.mode = 'list';
  }

// para pasar al modo “delete”
  enterDelete(): void {
    this.mode = 'delete';
  }

// para volver siempre al modo crear
  backToCreate(): void {
    this.mode = 'create';
  }


  initForm(): void {
    this.limitForm = this.fb.group({
      categoryId: ['', Validators.required],
      monthlyLimit: [null, [Validators.required, Validators.min(1)]],
    });
  }

  loadCategories(): void {
    this.categoryService.getCategories(this.user.id).subscribe({
      next: (data) => {
        this.categories = data;
      },
      error: (err) => {
        console.error('Error loading categories:', err);
      }
    });
  }

  loadLimits(): void {
    this.spendingLimitService.listLimits(this.user.id).subscribe({
      next: data => this.limits = data,
      error: err => {
        console.error('Error loading limits:', err);
        this.snackbarService.showSnackbar('Error', 'No se pudieron cargar los límites');
      }
    });
  }

  onSubmit(): void {
    if (this.limitForm.invalid) return;

    const limit: SpendingLimitRequest = { ...this.limitForm.value };

    this.spendingLimitService
      .createSpendingLimit(this.user.id, limit)
      .subscribe({
        next: res => {
          this.createdLimit = res;
          this.limitForm.reset();
          this.loadCategories();
          this.loadLimits();
          this.snackbarService.showSnackbar(
            'Límite creado',
            'El límite se creó correctamente'
          );
        },
        error: err => {
          const backendMessage: string = err.error?.message ?? '';

          if (backendMessage.includes('Ya existe')) {
            this.snackbarService.showSnackbar(
              'Duplicated Limit',
              'The limit was already created'
            );
          } else if (
            backendMessage.includes('monto') ||
            backendMessage.includes('mayor a 0') ||
            backendMessage.toLowerCase().includes('zero')
          ) {
            this.snackbarService.showSnackbar(
              'Amount value incorrect',
              'Zero-value are not allowed'
            );
          } else {
            this.snackbarService.showSnackbar(
              'Error',
              backendMessage || 'Limit was not created'
            );
          }
        }
      });
  }

  deleteSelectedLimit(): void {
    const catId = this.limitForm.get('categoryId')?.value;
    if (!catId) {
      return this.snackbarService.showSnackbar('Error', 'Selecciona una categoría');
    }

    this.spendingLimitService
      .deleteLimit(this.user.id, catId)
      .subscribe({
        next: () => {
          this.snackbarService.showSnackbar('Límite eliminado', '');
          this.loadLimits();
        },
        error: () =>
          this.snackbarService.showSnackbar('Error', 'No se pudo eliminar el límite')
      });
  }

}
