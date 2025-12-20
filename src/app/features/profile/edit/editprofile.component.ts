import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { UpdateProfileRequest, UserProfileResponse } from '../../../models/User';
import { AuthService } from '../../../services/Auth.service';

@Component({
  selector: 'app-editprofile',
  templateUrl: './editprofile.component.html',
  styleUrls: ['./editprofile.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule]
})
export class EditProfileComponent implements OnInit {
  profileForm!: FormGroup;
  isLoading = false;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  showPassword = false;

  userInfo: any;
  showMenu = false;

  constructor(private router: Router, private fb: FormBuilder, private authService: AuthService) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.userInfo = JSON.parse(userStr);

      this.profileForm = this.fb.group({
        firstName: [this.userInfo.firstName || '', Validators.required],
        lastName: [this.userInfo.lastName || '', Validators.required],
        password: [this.userInfo.password],
        email: [this.userInfo.email || '', [Validators.required, Validators.email]]
      });
    }
  }
  
  onSave(): void {
    if (this.profileForm.valid) {
      this.isSubmitting = true;
      this.successMessage = '';
      this.errorMessage = '';
      
      const rawFormValue = this.profileForm.getRawValue();
  
      const updateRequest: UpdateProfileRequest = {
        firstName: rawFormValue.firstName,
        lastName: rawFormValue.lastName,
        email: rawFormValue.email,
        password: rawFormValue.password
      };
      console.log(this.profileForm.value);
      if (rawFormValue.password?.trim()) {
        updateRequest.password = rawFormValue.password.trim();
      }
  
      this.authService.updateUserProfile(this.userInfo.id, updateRequest).subscribe({
        next: (updatedProfile: UserProfileResponse) => {
          this.successMessage = 'Perfil actualizado correctamente';
          this.isSubmitting = false;
  
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

          // Redirigir después de un breve delay para mostrar el mensaje de éxito
          setTimeout(() => {
            this.router.navigate(['/dashboard/profile']);
          }, 1500);
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Error al actualizar el perfil';
          this.isSubmitting = false;
        }
      });
    }
  }

  // Nuevos métodos para el UI
  goBack(): void {
    this.router.navigate(['/dashboard/profile']);
  }

  getInitials(): string {
    if (!this.userInfo?.firstName || !this.userInfo?.lastName) {
      return 'U';
    }
    return `${this.userInfo.firstName.charAt(0)}${this.userInfo.lastName.charAt(0)}`.toUpperCase();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  resetForm(): void {
    this.profileForm.patchValue({
      firstName: this.userInfo.firstName || '',
      lastName: this.userInfo.lastName || '',
      email: this.userInfo.email || '',
      password: ''
    });
    this.successMessage = '';
    this.errorMessage = '';
    this.showPassword = false;
  }
}
