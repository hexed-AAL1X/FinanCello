import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { interval, Subscription } from 'rxjs';

import { SpendingLimitService } from '../../../../services/SpendingLimit.service';
import { SpendingLimitAlertResponse } from '../../../../models/SpendingLimit';
import { AuthResponse } from '../../../../models/User';

@Component({
  selector: 'app-spending-limit-alert',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './spending-limit-alert.component.html',
  styleUrls: ['./spending-limit-alert.component.css'],
})
export class SpendingLimitAlertComponent implements OnInit, OnDestroy {
  user!: AuthResponse;
  alerts: SpendingLimitAlertResponse[] = [];
  selectedAlert: SpendingLimitAlertResponse | null = null;
  barWidth = '0%';
  exceededAmount = 0;
  isLoading = false;
  errorMessage = '';
  
  // Math object for template usage
  Math = Math;
  
  // Auto-refresh functionality
  private refreshSubscription?: Subscription;
  private readonly REFRESH_INTERVAL = 30000; // 30 seconds

  constructor(private spendingLimitService: SpendingLimitService) {}

  ngOnInit(): void {
    // 1) Leer user de localStorage
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      console.error('No user found in localStorage');
      this.errorMessage = 'Usuario no autenticado';
      return;
    }
    this.user = JSON.parse(storedUser);

    // 2) Cargar las alertas del backend
    this.loadAlerts();

    // 3) Configurar auto-refresh
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  private startAutoRefresh(): void {
    this.refreshSubscription = interval(this.REFRESH_INTERVAL).subscribe(() => {
      this.loadAlerts();
    });
  }

  private stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  private loadAlerts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.spendingLimitService
        .getSpendingLimitAlerts(this.user.id)
        .subscribe({
          next: (data) => {
            console.log('Alerts loaded:', data);
            
            // 3) Filtrar sólo las que estén por encima del límite
            this.alerts = data.filter(a => a.overLimit);
            
            // 4) Mostrar notificación si hay nuevas alertas
            if (this.alerts.length > 0) {
              this.showNotification();
              
              // Seleccionar la primera alerta si no hay ninguna seleccionada
              if (!this.selectedAlert) {
                this.selectAlert(this.alerts[0]);
              } else {
                // Actualizar la alerta seleccionada si aún existe
                const updatedSelectedAlert = this.alerts.find(a => 
                  a.categoryName === this.selectedAlert?.categoryName
                );
                if (updatedSelectedAlert) {
                  this.selectAlert(updatedSelectedAlert);
                } else {
                  this.selectAlert(this.alerts[0]);
                }
              }
            } else {
              this.selectedAlert = null;
            }
            
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Error loading alerts', err);
            this.errorMessage = 'Error al cargar las alertas. Inténtalo de nuevo.';
            this.isLoading = false;
          }
        });
  }

  selectAlert(alert: SpendingLimitAlertResponse): void {
    this.selectedAlert = alert;
    const percentage = Math.min((alert.totalSpent / alert.monthlyLimit) * 100, 150);
    this.barWidth = `${percentage}%`;
    this.exceededAmount = Math.max(alert.totalSpent - alert.monthlyLimit, 0);
  }

  dismiss(alert: SpendingLimitAlertResponse): void {
    // Confirmar antes de descartar
    if (confirm(`¿Estás seguro de que quieres descartar la alerta para ${alert.categoryName}?`)) {
      this.alerts = this.alerts.filter(a => a !== alert);
      if (this.selectedAlert === alert) {
        this.selectedAlert = this.alerts.length > 0 ? this.alerts[0] : null;
      }
    }
  }

  dismissAll(): void {
    if (confirm('¿Estás seguro de que quieres descartar todas las alertas?')) {
      this.alerts = [];
      this.selectedAlert = null;
    }
  }

  refreshAlerts(): void {
    this.loadAlerts();
  }

  private showNotification(): void {
    // Mostrar notificación del navegador si está permitido
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Límite de Gastos Excedido', {
        body: `Tienes ${this.alerts.length} alerta(s) de límite de gastos`,
        icon: '/assets/icons/money-red.png'
      });
    }
    
    // También mostrar notificación en la página
    this.showPageNotification();
  }

  private showPageNotification(): void {
    // Crear una notificación temporal en la página
    const notification = document.createElement('div');
    notification.className = 'page-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <span>⚠️ Tienes ${this.alerts.length} alerta(s) de límite de gastos</span>
        <button onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remover automáticamente después de 5 segundos
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  getAlertSeverity(alert: SpendingLimitAlertResponse): string {
    const percentage = (alert.totalSpent / alert.monthlyLimit) * 100;
    if (percentage >= 150) return 'critical';
    if (percentage >= 120) return 'high';
    if (percentage >= 100) return 'medium';
    return 'low';
  }

  getAlertIcon(alert: SpendingLimitAlertResponse): string {
    const severity = this.getAlertSeverity(alert);
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      default: return '💡';
    }
  }

  getAlertColor(alert: SpendingLimitAlertResponse): string {
    const severity = this.getAlertSeverity(alert);
    switch (severity) {
      case 'critical': return '#ff0000';
      case 'high': return '#ff6600';
      case 'medium': return '#ffaa00';
      default: return '#0EA49B';
    }
  }

  goBack(): void {
    window.history.back();
  }

  requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      });
    }
  }
}

