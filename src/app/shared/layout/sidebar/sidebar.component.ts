import { Component, EventEmitter, OnInit, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AchievementService } from '../../../services/Achievement.service';
import { AchievementEventsService } from '../../../services/achievement-events.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Output() sidebarCollapsedChange = new EventEmitter<boolean>();

  userInfo: any;
  activeSection: string = 'home';
  
  isCollapsed: boolean = false;
  isMobileOpen: boolean = false;
  achievementCount: number = 0;

  private achievementRefreshSubscription?: Subscription;
  private routerSubscription?: Subscription;

  constructor(
    private router: Router,
    private achievementService: AchievementService,
    private achievementEventsService: AchievementEventsService
  ) {}

  ngOnInit(): void {
    this.syncActiveFromUrl(this.router.url);
    this.routerSubscription = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.syncActiveFromUrl(e.urlAfterRedirects));

    setTimeout(() => {
      this.loadUserAchievements();
    }, 1000);
    this.subscribeToAchievementEvents();
  }

  ngOnDestroy(): void {
    this.achievementRefreshSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
  }

  private syncActiveFromUrl(url: string): void {
    const path = url.split('?')[0];
    if (path.includes('/dashboard/finances')) this.activeSection = 'myfinances';
    else if (path.includes('/dashboard/load-files')) this.activeSection = 'loadfiles';
    else if (path.includes('/dashboard/categories')) this.activeSection = 'categories';
    else if (path.includes('/dashboard/savinggoals')) this.activeSection = 'savinggoals';
    else if (path.includes('/dashboard/logros')) this.activeSection = 'logros';
    else if (path.includes('/dashboard/profile')) this.activeSection = 'profile';
    else if (path.includes('/dashboard/settings')) this.activeSection = 'settings';
    else if (path.startsWith('/dashboard')) this.activeSection = 'home';
  }

  private getUserId(): number {
    const userStr = localStorage.getItem('user');
    console.log('Sidebar: User string from localStorage:', userStr);
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('Sidebar: Parsed user object:', user);
        return user.id;
      } catch (error) {
        console.error('Sidebar: Error parsing user from localStorage:', error);
        return 0;
      }
    }
    console.log('Sidebar: No user found in localStorage');
    return 0;
  }

  private loadUserAchievements(): void {
    const userId = this.getUserId();
    console.log('Sidebar: Loading achievements for userId:', userId);
    
    if (userId > 0) {
      // Try the new endpoint first
      this.achievementService.getUserAchievements(userId).subscribe({
        next: (achievements) => {
          console.log('Sidebar: Achievements received from new endpoint:', achievements);
          this.achievementCount = achievements.length;
          console.log('Sidebar: Achievement count set to:', this.achievementCount);
        },
        error: (error) => {
          console.error('Sidebar: Error with new endpoint, trying alternative:', error);
          // Try the alternative endpoint
          this.achievementService.getUserAchievementsAlternative(userId).subscribe({
            next: (achievements) => {
              console.log('Sidebar: Achievements received from alternative endpoint:', achievements);
              this.achievementCount = achievements.length;
              console.log('Sidebar: Achievement count set to:', this.achievementCount);
            },
            error: (altError) => {
              console.error('Sidebar: Both endpoints failed:', altError);
              this.achievementCount = 0;
            }
          });
        }
      });
    } else {
      console.log('Sidebar: No valid userId found');
      this.achievementCount = 0;
    }
  }

  private subscribeToAchievementEvents(): void {
    this.achievementRefreshSubscription = this.achievementEventsService.achievementRefresh$.subscribe(() => {
      this.loadUserAchievements();
    });
  }

  sectionRoutes: { [key: string]: string } = {
    home: '/dashboard',
    myfinances: '/dashboard/finances',
    loadfiles: '/dashboard/load-files',
    savinggoals: '/dashboard/savinggoals',
    categories: '/dashboard/categories',
    logros: '/dashboard/logros',
    profile: '/dashboard/profile',
    settings: '/dashboard/settings'
  };
  
  setActive(section: string): void {
    this.activeSection = section;
    const route = this.sectionRoutes[section];
    if (route) {
        this.router.navigate([route]);
    } else {
        this.router.navigate(['/auth/login']);
    }
    // Cierra el sidebar en móvil al navegar
    this.isMobileOpen = false;
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    this.sidebarCollapsedChange.emit(this.isCollapsed);
  }

  getAdmin(): void {
    alert('Funcionalidad para obtener cuenta admin próximamente.');
  }
} 