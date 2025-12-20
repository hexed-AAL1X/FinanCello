import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SavingGoalService } from '../../../../services/SavingGoal.service';
import { AddSavingGoalResponse, UserGoalsWithContributionsResponse } from '../../../../models/SavingGoal';
import { SnackbarService } from '../../../../shared/layout/snackbar/snackbar.service';
import { EditGoalFormComponent } from '../savinggoal-form/edit/editgoal-form.component';
import { ContributionsModalComponent } from './contributions-modal.component';
import { AchievementEventsService } from '../../../../services/achievement-events.service';
import { DataRefreshService } from '../../../../services/data-refresh.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-savinggoal-list',
  standalone: true,
  imports: [CommonModule, RouterModule, EditGoalFormComponent, ContributionsModalComponent],
  templateUrl: './savinggoal-list.component.html',
  styleUrls: ['./savinggoal-list.component.css'],
  animations: [trigger('routeAnimations', [
    transition('* => new', [
      style({ opacity: 0, transform: 'translateY(10%)' }),
      animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
    ])
  ])]
})
export class SavingGoalListComponent implements OnInit, OnDestroy {
  savingGoals: AddSavingGoalResponse[] = [];
  goalsWithContributions: UserGoalsWithContributionsResponse[] = [];
  selectedGoal: AddSavingGoalResponse | null = null;
  selectedGoalForContributions: AddSavingGoalResponse | null = null;
  showContributionsModal = false;
  loading = false;
  error: string | null = null;
  private refreshSubscription: Subscription | null = null;

  constructor(
    private savingGoalService: SavingGoalService,
    private router: Router,
    private snackbarService: SnackbarService,
    private achievementEventsService: AchievementEventsService,
    private dataRefreshService: DataRefreshService
  ) {}

  ngOnInit() {
    this.fetchSavingGoals();
    this.setupRefreshListener();
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  fetchSavingGoals() {
    this.loading = true;
    this.error = null;
    
    // Obtener el userId del localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      this.error = 'Usuario no autenticado';
      this.loading = false;
      return;
    }
    
    const user = JSON.parse(userStr);
    const userId = user.id;
    
    // Cargar metas con contribuciones
    this.savingGoalService.getUserGoalsWithContributions(userId).subscribe({
      next: (goalsWithContributions) => {
        this.goalsWithContributions = goalsWithContributions;
        
        // Convertir a AddSavingGoalResponse para mantener compatibilidad
        this.savingGoals = goalsWithContributions.map(g => ({
          id: g.goalId,
          name: g.goalName,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          dueDate: g.dueDate,
          userId: userId
        }));
        
        this.loading = false;
        
        // Check if any goals were completed and trigger achievement refresh
        const completedGoals = goalsWithContributions.filter(goal => goal.currentAmount >= goal.targetAmount);
        if (completedGoals.length > 0) {
          this.achievementEventsService.triggerGoalCompletionRefresh();
        }
      },
      error: (err) => {
        console.error('Error fetching saving goals:', err);
        this.error = 'Error al cargar las metas de ahorro. Por favor, intenta nuevamente.';
        this.loading = false;
        this.snackbarService.showSnackbar(
          'Error',
          'No se pudieron cargar las metas de ahorro',
          'assets/icons/error.png'
        );
      }
    });
  }

  onEdit(goal: AddSavingGoalResponse) {
    this.selectedGoal = goal;
  }

  onDelete(goal: AddSavingGoalResponse) {
    // Verificar si la meta tiene contribuciones
    const hasContributions = goal.currentAmount > 0;
    
    let message = `¿Seguro que deseas eliminar la meta "${goal.name}"?`;
    
    if (hasContributions) {
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(goal.currentAmount);
      
      message = `⚠️ ADVERTENCIA: Esta meta tiene contribuciones de ${formattedAmount}.\n\n¿Estás seguro de que deseas eliminar la meta "${goal.name}"?\n\nEsta acción eliminará también todas las contribuciones asociadas y no se puede deshacer.`;
    }
    
    if (confirm(message)) {
      this.loading = true;
      
      this.savingGoalService.deleteSavingGoal(goal.id).subscribe({
        next: () => {
          const successMessage = hasContributions 
            ? 'Meta eliminada junto con todas sus contribuciones'
            : 'La meta de ahorro se ha eliminado exitosamente';
            
          this.snackbarService.showSnackbar(
            'Meta eliminada',
            successMessage,
            'assets/icons/success.png'
          );
          
          // Trigger data refresh
          this.dataRefreshService.refreshSavingGoals();
          
          // Trigger achievement refresh
          this.achievementEventsService.triggerGoalCompletionRefresh();
        },
        error: (err) => {
          console.error('Error completo:', err);
          console.error('Error deleting saving goal:', err);
          console.error('Status:', err.status);
          console.error('Message:', err.message);
          console.error('Error body:', err.error);
          
          this.loading = false;
          
          // Manejar el error específico del backend
          if (err.status === 500 && err.error?.detail) {
            const errorMessage = err.error.detail;
            if (errorMessage.includes('tiene aportes registrados')) {
              this.snackbarService.showSnackbar(
                'No se puede eliminar',
                'Esta meta tiene contribuciones registradas. Primero debes eliminar las contribuciones.',
                'assets/icons/warning.png'
              );
            } else {
              this.snackbarService.showSnackbar(
                'Error del servidor',
                errorMessage,
                'assets/icons/error.png'
              );
            }
          } else {
            this.error = 'No se pudo eliminar la meta. Por favor, intenta nuevamente.';
            this.snackbarService.showSnackbar(
              'Error',
              'No se pudo eliminar la meta de ahorro',
              'assets/icons/error.png'
            );
          }
        }
      });
    } else {
      console.log('Usuario canceló la eliminación');
    }
  }

  onNewGoal() {
    this.router.navigate(['/dashboard/savinggoals/new']);
  }

  onCloseEditForm() {
    this.selectedGoal = null;
    // Trigger data refresh
    this.dataRefreshService.refreshSavingGoals();
  }

  onViewContributions(goal: AddSavingGoalResponse) {
    this.selectedGoalForContributions = goal;
    this.showContributionsModal = true;
  }

  onCloseContributionsModal() {
    this.showContributionsModal = false;
    this.selectedGoalForContributions = null;
  }

  onContributionsDeleted() {
    // Trigger data refresh
    this.dataRefreshService.refreshContributions();
    
    // Trigger achievement refresh
    this.achievementEventsService.triggerContributionRefresh();
  }

  getLastContribution(goalId: number): any {
    const goalWithContributions = this.goalsWithContributions.find(g => g.goalId === goalId);
    if (goalWithContributions && goalWithContributions.contributions && goalWithContributions.contributions.length > 0) {
      // Ordenar por fecha y obtener la más reciente
      const sortedContributions = goalWithContributions.contributions.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      return sortedContributions[0];
    }
    return null;
  }

  private setupRefreshListener() {
    this.refreshSubscription = this.dataRefreshService.getRefreshObservable().subscribe(event => {
      if (event && (event.type === 'savingGoals' || event.type === 'contributions' || event.type === 'all')) {
        console.log('SavingGoalListComponent: Refreshing data due to', event.type);
        this.fetchSavingGoals();
      }
    });
  }
}
