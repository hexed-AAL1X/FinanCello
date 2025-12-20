import { ChangeDetectionStrategy, Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CategoryService } from '../../../../services/Category.service';
import { CategoryRequest, CategorySimpleResponse } from '../../../../models/Category';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryFormComponent {
  categoryForm!: FormGroup;
  action: 'create' | 'edit' | 'delete' = 'create';
  selectedCategory: CategorySimpleResponse | null = null;
  categories: CategorySimpleResponse[] = [];
  userInfo: any;

  constructor(
    private fb: FormBuilder, 
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef
  ) {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.userInfo = JSON.parse(userStr);
    }
  }

  ngOnInit(): void {
    this.initForm();
    this.loadCategories();
  }

  loadCategories(): void {
    if (!this.userInfo?.id) {
      this.showError({ message: 'Usuario no autenticado' });
      return;
    }
    
    this.categoryService.getCategories(this.userInfo.id).subscribe({
        next: (res) => {
          this.categories = res;
          // Si estamos editando y hay una categoría seleccionada, actualizar la referencia
          if (this.action === 'edit' && this.selectedCategory) {
            const updatedCategory = this.categories.find(cat => cat.id === this.selectedCategory?.id);
            if (updatedCategory) {
              this.selectedCategory = updatedCategory;
            } else {
              // Si la categoría ya no existe (fue eliminada), limpiar la selección
              this.selectedCategory = null;
            }
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          if (err.status === 404) {
            this.categories = [];
            console.log('Usuario no tiene categorías aún');
          } else {
            this.showError(err);
          }
          this.cdr.detectChanges();
        }
    })
  }

  showError(error: any) {
    const msg = 
    error?.error?.detail ||
    error?.error?.message ||
    error?.message ||
    'Error inesperado';
    Swal.fire('Error', msg, 'error')
  }

  initForm(): void {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  setAction(newAction: 'create' | 'edit' | 'delete'): void {
    this.action = newAction;
    this.selectedCategory = null;
    this.categoryForm.reset();
  }

  selectCategoryToEdit(cat: CategorySimpleResponse): void {
    this.selectedCategory = cat;
    this.categoryForm.patchValue(cat);
  }

  cancelEdit(): void {
    this.selectedCategory = null;
    this.categoryForm.reset();
  }

  onSubmit(): void {
    if (!this.categoryForm.valid) return;

    const data = this.categoryForm.value as CategoryRequest;
    
    if (!this.userInfo?.id) {
      this.showError({ message: 'Usuario no autenticado' });
      return;
    }
    
    if (this.action === 'create') {
        this.categoryService.createCategory(this.userInfo.id, data).subscribe({
            next: () => {
                Swal.fire('Creado', 'La categoría fue creada correctamente', 'success');
                this.loadCategories();
                this.categoryForm.reset();
            },
            error: (err) => this.showError(err)
        });
    } else if (this.action === 'edit' && this.selectedCategory) {
        const id = this.selectedCategory.id;
        this.categoryService.updateCategory(id, data).subscribe({
            next: () => {
                Swal.fire('Actualizado', 'La categoría fue actualizada correctamente', 'success');
                this.loadCategories();
                // Mantener la categoría seleccionada pero limpiar el formulario
                this.categoryForm.reset();
            },
            error: (err) => this.showError(err)
        });
    }
  }

  selectCategoryToDelete(cat: CategorySimpleResponse): void {
    this.selectedCategory = cat;
  }

  confirmDelete(): void {
    if (this.selectedCategory) {
        const id = this.selectedCategory.id;
        this.categoryService.deleteCategory(id).subscribe({
            next: () => {
                Swal.fire('Eliminado', 'La categoría fue eliminada correctamente', 'success');
                this.selectedCategory = null;
                // Actualizar inmediatamente la lista local
                this.categories = this.categories.filter(cat => cat.id !== id);
                this.cdr.detectChanges();
                // Luego recargar desde el servidor para asegurar sincronización
                this.loadCategories();
            },
            error: (err) => this.showError(err)
        });
    }
  }

}
