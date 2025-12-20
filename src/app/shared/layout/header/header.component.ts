import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  userInfo: any;
  showMenu = false;
  @Output() sidebarToggle = new EventEmitter<void>();

  constructor(private router: Router) {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.userInfo = JSON.parse(userStr);
      console.log(this.userInfo);
    }
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  showNotifications() {
    alert('Notificaciones aún no implementadas.');
  }

  toggleUserMenu() {
    this.showMenu = !this.showMenu;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/auth/login']);
  }

  toggleSidebar() {
    this.sidebarToggle.emit();
  }
}
