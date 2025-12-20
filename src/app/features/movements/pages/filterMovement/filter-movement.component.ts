import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FinancialMovementService } from '../../../../services/FinancialMovement.service';
import { CategoryService } from '../../../../services/Category.service';
import { RegisterFinancialMovementResponse } from '../../../../models/FinancialMovement';
import { CategorySimpleResponse } from '../../../../models/Category';
import { SnackbarService } from '../../../../shared/layout/snackbar/snackbar.service';

@Component({
  selector: 'app-filter-movements',
  standalone: true,
  templateUrl: './filter-movement.component.html',
  styleUrls: ['./filter-movement.component.css'],
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class FilterFinancialMovementComponent implements OnInit {

  filterForm: FormGroup;
  categories: CategorySimpleResponse[] = [];
  results: RegisterFinancialMovementResponse[] = [];
  submitted: boolean = false;

  constructor(
    private fb: FormBuilder,
    private movementService: FinancialMovementService,
    private categoryService: CategoryService,
    private snackbarService: SnackbarService
  ) {
    this.filterForm = this.fb.group({
      categoryName: [''],
      movementType: ['']
    });
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.categoryService.getCategories(1).subscribe({
      next: (data) => {
        this.categories = data;
      },
      error: () => {
        this.snackbarService.showSnackbar(
          'Category Not Found',
          'Failed to load categories',
        );
      }
    });
  }
/*
  onSubmit(): void {
    const { categoryName, movementType } = this.filterForm.value;
    const userId = 3;

    let categoryId: number | null = null;

    if (categoryName) {
      const selectedCategory = this.categories.find(
        c => c.name.trim().toLowerCase() === categoryName.trim().toLowerCase()
      );
      if (selectedCategory && 'id' in selectedCategory) {
        categoryId = selectedCategory.id;
      } else {
        this.snackbarService.showSnackbar(
          'Invalid Category',
          'Category not found',
        );
        return;
      }
    }*/
  onSubmit(): void {
    const { categoryName, movementType } = this.filterForm.value;
    const userId = 3;

    console.log('Formulario:', this.filterForm.value);
    console.log('Categorías disponibles:', this.categories);

    let categoryId: number | null = null;

    if (categoryName) {
      const selectedCategory = this.categories.find(
        c => c.name.trim().toLowerCase() === categoryName.trim().toLowerCase()
      );
      if (selectedCategory) {
        categoryId = selectedCategory.id;
        console.log('Categoría encontrada:', selectedCategory);
      } else {
        console.error('Categoría no encontrada');
        this.snackbarService.showSnackbar(
          'Invalid Category',
          'Category not found',
          'error'
        );
        return;
      }
    }

    this.movementService
      .filter(userId, categoryId, movementType || null)
      .subscribe({
        next: (data) => {
          console.log('Resultados:', data);
          this.results = data;
          this.submitted = true;
        },
        error: (err) => {
          console.error('Error al filtrar:', err);
          this.snackbarService.showSnackbar(
            'Invalid Movement',
            'Filter Movement unsuccesfully',
            'error'
          );
        }
      });


    this.movementService
      .filter(userId, categoryId, movementType || null)
      .subscribe({
        next: (data) => {
          this.results = data;
          this.submitted = true;
        },
        error: (err) => {
          this.snackbarService.showSnackbar(
            'Invalid Movement',
            'Filter Movement unsuccesfully',
            'error'
          );
        }
      });
  }

  onCancel(): void {
    this.filterForm.reset();
    this.results = [];
    this.submitted = false;
  }
}
