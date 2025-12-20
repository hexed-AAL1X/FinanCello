import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SavingGoalService } from '../../../../../services/SavingGoal.service';
import { UpdateSavingGoalRequest, AddSavingGoalResponse } from '../../../../../models/SavingGoal';
import { Router } from '@angular/router';
import { SnackbarService } from '../../../../../shared/layout/snackbar/snackbar.service';

@Component({
  selector: 'app-editgoal-form',
  templateUrl: './editgoal-form.component.html',
  styleUrls: ['./editgoal-form.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule]
})
export class EditGoalFormComponent implements OnInit {
  @Input() goal!: AddSavingGoalResponse;
  @Output() closeForm = new EventEmitter<void>();

  goalForm!: FormGroup;

  constructor(
    private fb: FormBuilder, 
    private savingGoalService: SavingGoalService, 
    private router: Router,
    private snackbarService: SnackbarService
  ) {}

  ngOnInit(): void {
    this.goalForm = this.fb.group({
      name: [this.goal.name, [Validators.required, Validators.maxLength(50)]],
      targetAmount: [this.goal.targetAmount, [Validators.required, Validators.min(1)]],
      dueDate: [this.goal.dueDate, [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.goalForm.valid) {
      const updatedGoal: UpdateSavingGoalRequest = {
        name: this.goalForm.value.name,
        targetAmount: this.goalForm.value.targetAmount,
        dueDate: this.goalForm.value.dueDate
      };
  
      this.savingGoalService
        .updateSavingGoal(this.goal.id, updatedGoal)
        .subscribe({
          next: (response) => {
            this.snackbarService.showSnackbar('Meta actualizada', 'La meta se ha actualizado exitosamente', 'assets/icons/success.png', true);
            this.closeForm.emit();
          },
          error: (err) => {
            console.error('Error updating goal:', err);
            this.snackbarService.showSnackbar('Error', 'No se pudo actualizar la meta de ahorro', 'assets/icons/error.png', true);
          }
        });
    } else {
      this.goalForm.markAllAsTouched();
    }
  }
  
  onCancel(): void {
    this.closeForm.emit();
  }
}
