import { Component, OnInit } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SavingGoalService } from '../../../../services/SavingGoal.service';
import { AddSavingGoalRequest, AddSavingGoalResponse } from '../../../../models/SavingGoal';
import { SnackbarService } from '../../../../shared/layout/snackbar/snackbar.service';

@Component({
  selector: 'app-savinggoal-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './savinggoal-form.component.html',
  styleUrls: ['./savinggoal-form.component.css']
})
export class SavingGoalFormComponent implements OnInit {
  // Control de pestañas
  activeTab: 'create' | 'edit' | 'delete' = 'create';
  
  // Estados generales
  loading = false;
  error: string | null = null;
  savingGoals: AddSavingGoalResponse[] = [];
  
  // Estado para creación
  createGoal: AddSavingGoalRequest = {
    name: '',
    targetAmount: 0,
    dueDate: this.getTomorrowDate()
  };
  
  // Estado para edición
  selectedGoal: AddSavingGoalResponse | null = null;
  editGoal: AddSavingGoalRequest = {
    name: '',
    targetAmount: 0,
    dueDate: this.getTomorrowDate()
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private savingGoalService: SavingGoalService,
    private snackbarService: SnackbarService
  ) {}

  ngOnInit() {
    // Determinar si estamos en modo de edición desde la URL
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.activeTab = 'edit';
        this.loadGoalData(Number(id));
      }
    });
    
    // Cargar todas las metas
    this.loadSavingGoals();
  }

  // Cambiar entre pestañas
  switchTab(tab: 'create' | 'edit' | 'delete') {
    this.activeTab = tab;
    this.selectedGoal = null;
    this.error = null;
    
    if (tab === 'edit' || tab === 'delete') {
      this.loadSavingGoals();
    }
  }
  
  // Cargar todas las metas
  loadSavingGoals() {
    this.loading = true;
    this.savingGoalService.listSavingGoals().subscribe({
      next: (goals) => {
        this.savingGoals = goals;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading goals:', err);
        this.error = 'Error al cargar las metas de ahorro. Por favor, intenta nuevamente más tarde.';
        this.loading = false;
      }
    });
  }

  // Cargar datos de una meta específica
  loadGoalData(goalId: number) {
    this.loading = true;
    this.savingGoalService.listSavingGoals().subscribe({
      next: (goals) => {
        const goalToEdit = goals.find(g => g.id === goalId);
        if (goalToEdit) {
          this.selectedGoal = goalToEdit;
          this.editGoal = {
            name: goalToEdit.name,
            targetAmount: goalToEdit.targetAmount,
            dueDate: goalToEdit.dueDate
          };
        } else {
          this.error = 'No se encontró la meta de ahorro';
          setTimeout(() => this.router.navigate(['/dashboard/savinggoals']), 2000);
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading goal:', err);
        this.error = 'Error al cargar los datos de la meta';
        this.loading = false;
      }
    });
  }

  // Seleccionar una meta para editar
  selectGoalToEdit(goal: AddSavingGoalResponse) {
    this.selectedGoal = goal;
    this.editGoal = {
      name: goal.name,
      targetAmount: goal.targetAmount,
      dueDate: goal.dueDate
    };
  }

  // Cancelar la edición
  cancelEdit() {
    console.log('Cancelando edición...');
    this.selectedGoal = null;
    this.editGoal = {
      name: '',
      targetAmount: 0,
      dueDate: ''
    };
    // Regresar a la página anterior
    console.log('Regresando a la página anterior desde cancelEdit');
    window.history.back();
  }

  // Enviar formulario de creación
  submitCreateForm() {
    if (!this.validateGoal(this.createGoal)) return;
    
    this.loading = true;
    this.savingGoalService.addSavingGoal(this.createGoal).subscribe({
      next: () => {
        this.snackbarService.showSnackbar(
          'Meta creada',
          'La meta de ahorro se ha creado exitosamente',
          'assets/icons/success.png'
        );
        window.history.back();
      },
      error: (err) => {
        console.error('Error creating goal:', err);
        this.error = 'Error al crear la meta de ahorro';
        this.loading = false;
        this.snackbarService.showSnackbar(
          'Error',
          'No se pudo crear la meta de ahorro',
          'assets/icons/error.png'
        );
      }
    });
  }

  // Enviar formulario de edición
  submitEditForm() {
    if (!this.selectedGoal) return;
    
    if (!this.validateGoal(this.editGoal)) return;
    
    this.loading = true;
    const updateRequest = {
      targetAmount: this.editGoal.targetAmount,
      dueDate: this.editGoal.dueDate
    };
    
    this.savingGoalService.updateSavingGoal(this.selectedGoal.id, updateRequest).subscribe({
      next: () => {
        this.snackbarService.showSnackbar(
          'Meta actualizada',
          'La meta de ahorro se ha actualizado exitosamente',
          'assets/icons/success.png'
        );
        window.history.back();
      },
      error: (err) => {
        console.error('Error updating goal:', err);
        this.error = 'Error al actualizar la meta de ahorro';
        this.loading = false;
        this.snackbarService.showSnackbar(
          'Error',
          'No se pudo actualizar la meta de ahorro',
          'assets/icons/error.png'
        );
      }
    });
  }

  // Confirmar eliminación
  confirmDelete(goal: AddSavingGoalResponse) {
    if (confirm(`¿Estás seguro de que deseas eliminar la meta "${goal.name}"?`)) {
      this.loading = true;
      this.savingGoalService.deleteSavingGoal(goal.id).subscribe({
        next: () => {
          this.snackbarService.showSnackbar(
            'Meta eliminada',
            'La meta de ahorro se ha eliminado exitosamente',
            'assets/icons/success.png'
          );
          this.loadSavingGoals();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error deleting goal:', err);
          this.error = 'Error al eliminar la meta de ahorro';
          this.loading = false;
          this.snackbarService.showSnackbar(
            'Error',
            'No se pudo eliminar la meta de ahorro',
            'assets/icons/error.png'
          );
        }
      });
    }
  }

  // Validar meta de ahorro
  validateGoal(goal: AddSavingGoalRequest): boolean {
    const today = new Date();
    const dueDate = new Date(goal.dueDate);

    if (goal.targetAmount <= 0) {
      this.snackbarService.showSnackbar(
        'Datos incorrectos',
        'No se permiten valores cero o negativos para el monto objetivo',
        'assets/icons/warning.png'
      );
      return false;
    }

    if (dueDate <= today) {
      this.snackbarService.showSnackbar(
        'Fecha incorrecta',
        'La fecha límite debe ser futura',
        'assets/icons/warning.png'
      );
      return false;
    }

    return true;
  }

  // Obtener la fecha de mañana en formato YYYY-MM-DD para el input date
  getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  // Regresar a la página anterior
  goBack() {
    console.log('Regresando a la página anterior');
    // Usar history.back() para regresar a la página anterior
    window.history.back();
  }
}
