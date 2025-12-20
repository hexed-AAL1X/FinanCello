import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/Auth.service';
import { RegisterRequest, UserType } from '../../../models/User';
import { SnackbarService } from '../../../shared/layout/snackbar/snackbar.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  UserType = UserType;
  private snackbarService = inject(SnackbarService);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      userType: [UserType.PERSONAL, [Validators.required]]
    });
  }

  onSubmit() {
    this.registerForm.markAllAsTouched();
  
    const isFormValid = this.registerForm.valid;
    console.log('Formulario válido:', isFormValid);
    console.log('Valores:', this.registerForm.value);
  
    if (!isFormValid) {
      this.snackbarService.showSnackbar(
        'Data are Missing',
        'Complete all the required fields',
        'icons/warning.png'
      );
      return;
    }
  
    this.isLoading = true;
    this.errorMessage = '';
  
    const registerRequest: RegisterRequest = this.registerForm.value;
  
    this.authService.register(registerRequest).subscribe({
      next: () => {
        this.snackbarService.showSnackbar(
          'Successful Record',
          'User created correctly',
          'icons/success.png'
        );
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        this.isLoading = false;
        console.log('Error recibido:', error);
  
        const backendMsg = error.error?.detail || error.error?.message || 'Registration failed';
  
        if (backendMsg.includes('Usuario duplicado')) {
          this.snackbarService.showSnackbar(
            'Duplicate Mail',
            'Email is already in use',
            'icons/error.png'
          );
        } else if (backendMsg.includes('Username already exists')) {
          this.snackbarService.showSnackbar(
            'Existing User',
            'Name was already registered',
            'icons/error.png'
          );
        } else if (backendMsg.includes('blank spaces')) {
          this.snackbarService.showSnackbar(
            'Data are Missing',
            'Complete all the required fields',
            'icons/warning.png'
          );
        } else {
          this.snackbarService.showSnackbar(
            'Error',
            backendMsg,
            'icons/error.png'
          );
        }
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}