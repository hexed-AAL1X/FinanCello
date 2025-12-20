import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoalContributionService } from '../../../../services/GoalContribution.service';
import { SavingGoalService } from '../../../../services/SavingGoal.service';
import { AddSavingGoalResponse, UserGoalsWithContributionsResponse, GoalContributionResponse } from '../../../../models/SavingGoal';
import { SnackbarService } from '../../../../shared/layout/snackbar/snackbar.service';
import { AchievementEventsService } from '../../../../services/achievement-events.service';
import { DataRefreshService } from '../../../../services/data-refresh.service';
import { RegisterGoalContributionRequest } from '../../../../models/GoalContribution';

@Component({
  selector: 'app-contributions-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contributions-modal.component.html',
  styleUrls: ['./contributions-modal.component.css']
})
export class ContributionsModalComponent implements OnInit, OnChanges {
  @Input() goal: AddSavingGoalResponse | null = null;
  @Input() isVisible: boolean = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() contributionsDeleted = new EventEmitter<void>();

  contributions: any[] = [];
  totalContributions: number = 0;
  loading: boolean = false;
  deletingContribution: number | null = null;
  deletingAll: boolean = false;

  // New contribution form
  showAddForm = false;
  newContribution = {
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  };
  addingContribution = false;

  constructor(
    private goalContributionService: GoalContributionService,
    private savingGoalService: SavingGoalService,
    private snackbarService: SnackbarService,
    private achievementEventsService: AchievementEventsService,
    private dataRefreshService: DataRefreshService
  ) {}

  ngOnInit() {
    // No cargar aquí, se cargará cuando se abra el modal
  }

  ngOnChanges() {
    // Cargar contribuciones cuando el modal se hace visible
    if (this.isVisible && this.goal) {
      this.loadContributions();
    }
  }

  loadContributions() {
    if (!this.goal) {
      console.log('No hay meta seleccionada');
      return;
    }
    
    console.log('Cargando contribuciones para meta:', this.goal);
    this.loading = true;
    this.contributions = [];
    this.totalContributions = 0;
    
    // Usar el método correcto que obtiene las metas con sus contribuciones
    this.savingGoalService.getUserGoalsWithContributions(this.goal.userId).subscribe({
      next: (goalsWithContributions: UserGoalsWithContributionsResponse[]) => {
        console.log('Metas con contribuciones recibidas:', goalsWithContributions);
        
        // Encontrar la meta específica usando goalId
        const targetGoal = goalsWithContributions.find(g => g.goalId === this.goal?.id);
        
        if (targetGoal && targetGoal.contributions) {
          console.log('Contribuciones encontradas para la meta:', targetGoal.contributions);
          this.contributions = targetGoal.contributions;
          this.totalContributions = targetGoal.contributions.reduce((sum: number, c: GoalContributionResponse) => sum + (c.amount || 0), 0);
          console.log('Total calculado:', this.totalContributions);
        } else {
          console.log('No se encontraron contribuciones para esta meta específica');
          this.contributions = [];
          this.totalContributions = 0;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando metas con contribuciones:', err);
        this.snackbarService.showSnackbar(
          'Error',
          'No se pudieron cargar las contribuciones',
          'assets/icons/error.png'
        );
        this.loading = false;
        this.contributions = [];
        this.totalContributions = 0;
      }
    });
  }

  addContribution() {
    if (!this.goal || this.newContribution.amount <= 0) {
      this.snackbarService.showSnackbar(
        'Error',
        'Por favor ingresa un monto válido',
        'assets/icons/error.png'
      );
      return;
    }

    this.addingContribution = true;
    const request: RegisterGoalContributionRequest = {
      goalId: this.goal.id,
      amount: this.newContribution.amount,
      date: this.newContribution.date
    };

    this.goalContributionService.registerContribution(request).subscribe({
      next: () => {
        this.snackbarService.showSnackbar(
          'Contribución agregada',
          'La contribución se ha agregado exitosamente',
          'assets/icons/success.png'
        );
        
        // Reset form
        this.newContribution = {
          amount: 0,
          date: new Date().toISOString().split('T')[0]
        };
        this.showAddForm = false;
        
        // Trigger data refresh
        this.dataRefreshService.refreshContributions();
        
        // Trigger achievement refresh
        this.achievementEventsService.triggerContributionRefresh();
        
        this.addingContribution = false;
      },
      error: (err) => {
        console.error('Error adding contribution:', err);
        this.snackbarService.showSnackbar(
          'Error',
          'No se pudo agregar la contribución',
          'assets/icons/error.png'
        );
        this.addingContribution = false;
      }
    });
  }

  deleteContribution(contributionId: number) {
    if (confirm('¿Estás seguro de que deseas eliminar esta contribución?')) {
      this.deletingContribution = contributionId;
      
      this.goalContributionService.deleteContribution(contributionId).subscribe({
        next: () => {
          this.snackbarService.showSnackbar(
            'Contribución eliminada',
            'La contribución se ha eliminado exitosamente',
            'assets/icons/success.png'
          );
          
          // Trigger data refresh
          this.dataRefreshService.refreshContributions();
          this.contributionsDeleted.emit();
          
          // Trigger achievement refresh
          this.achievementEventsService.triggerContributionRefresh();
        },
        error: (err) => {
          console.error('Error deleting contribution:', err);
          this.snackbarService.showSnackbar(
            'Error',
            'No se pudo eliminar la contribución',
            'assets/icons/error.png'
          );
          this.deletingContribution = null;
        }
      });
    }
  }

  deleteAllContributions() {
    if (!this.goal) return;
    
    const message = `¿Estás seguro de que deseas eliminar TODAS las contribuciones de "${this.goal.name}"?\n\nEsta acción no se puede deshacer.`;
    
    if (confirm(message)) {
      this.deletingAll = true;
      
      // Eliminar todas las contribuciones una por una
      const deletePromises = this.contributions.map(contribution => 
        this.goalContributionService.deleteContribution(contribution.id).toPromise()
      );
      
      Promise.all(deletePromises).then(() => {
                  this.snackbarService.showSnackbar(
            'Contribuciones eliminadas',
            'Todas las contribuciones se han eliminado exitosamente',
            'assets/icons/success.png'
          );
          
          // Trigger data refresh
          this.dataRefreshService.refreshContributions();
          this.contributionsDeleted.emit();
          
          // Trigger achievement refresh
          this.achievementEventsService.triggerContributionRefresh();
        
        this.deletingAll = false;
      }).catch(err => {
        console.error('Error deleting all contributions:', err);
        this.snackbarService.showSnackbar(
          'Error',
          'No se pudieron eliminar todas las contribuciones',
          'assets/icons/error.png'
        );
        this.deletingAll = false;
      });
    }
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
  }

  close() {
    // Limpiar el estado antes de cerrar
    this.contributions = [];
    this.totalContributions = 0;
    this.loading = false;
    this.showAddForm = false;
    this.newContribution = {
      amount: 0,
      date: new Date().toISOString().split('T')[0]
    };
    this.closeModal.emit();
  }
} 