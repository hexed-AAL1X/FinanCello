import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/Auth.service';
import { UserProfileResponse, UpdateProfileRequest } from '../../models/User';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { FinancialMovementService } from '../../services/FinancialMovement.service';
import { TransactionResponse } from '../../models/FinancialMovement';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  userInfo: any;
  showMenu = false;
  isEditing = false;
  private routerSubscription: Subscription;

  // NUEVO: variables para los valores calculados
  daysSinceRegistration: number = 0;
  transactionCount: number = 0;
  lastMovementDate: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private movementService: FinancialMovementService
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['']
    });

    // Obtener información del usuario actual del localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.userInfo = JSON.parse(userStr);
    }

    // Suscribirse a los cambios de ruta
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkCurrentRoute();
    });
  }

  ngOnInit() {
    this.loadUserProfile();
    this.checkCurrentRoute();
    this.daysSinceRegistration = this.getDaysSinceRegistration();
    this.loadMovementStats();
  }

  loadMovementStats() {
    if (!this.userInfo?.id) return;
    this.movementService.getMovements(this.userInfo.id).subscribe({
      next: (movements: TransactionResponse[]) => {
        this.transactionCount = movements.length;
        if (movements.length > 0) {
          // Buscar la fecha más reciente
          const last = movements.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b);
          this.lastMovementDate = last.date;
        } else {
          this.lastMovementDate = null;
        }
      },
      error: () => {
        this.transactionCount = 0;
        this.lastMovementDate = null;
      }
    });
  }

  checkCurrentRoute() {
    const currentUrl = this.router.url;
    this.isEditing = currentUrl.includes('/edit');
  }

  loadUserProfile() {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.getUserProfile(this.userInfo.id).subscribe({
      next: (profile: UserProfileResponse) => {
        this.profileForm.patchValue({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          password: ''
        });
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al cargar el perfil';
        this.isLoading = false;
      }
    });
  }

  onSubmit() {
    if (this.profileForm.valid) {
      this.isLoading = true;
      this.successMessage = '';
      this.errorMessage = '';

      const updateRequest: UpdateProfileRequest = {
        firstName: this.profileForm.get('firstName')?.value,
        lastName: this.profileForm.get('lastName')?.value,
        email: this.profileForm.get('email')?.value,
        password: this.profileForm.get('password')?.value
      };

      const password = this.profileForm.get('password')?.value;
      if (password) {
        updateRequest.password = password;
      }

      this.authService.updateUserProfile(this.userInfo.id, updateRequest).subscribe({
        next: (updatedProfile: UserProfileResponse) => {
          this.successMessage = 'Perfil actualizado correctamente';
          this.isLoading = false;
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            user.firstName = updatedProfile.firstName;
            user.lastName = updatedProfile.lastName;
            user.email = updatedProfile.email;
            localStorage.setItem('user', JSON.stringify(user));
            this.userInfo = user;
          }
          this.profileForm.patchValue({ password: '' });
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Error al actualizar el perfil';
          this.isLoading = false;
        }
      });
    }
  }

  resetForm() {
    this.loadUserProfile();
    this.successMessage = '';
    this.errorMessage = '';
  }

  navigateToEdit() {
    this.router.navigate(['/dashboard/profile/edit']);
  }

  getInitials(): string {
    if (!this.userInfo?.firstName || !this.userInfo?.lastName) {
      return 'U';
    }
    return `${this.userInfo.firstName.charAt(0)}${this.userInfo.lastName.charAt(0)}`.toUpperCase();
  }

  getDaysSinceRegistration(): number {
    const registrationDate = new Date('2024-01-01'); // Fecha de ejemplo
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - registrationDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  changePassword() {
    this.router.navigate(['/dashboard/profile/change-password']);
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
} 