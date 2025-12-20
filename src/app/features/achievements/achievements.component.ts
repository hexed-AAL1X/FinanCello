import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AchievementService } from '../../services/Achievement.service';
import { SavingGoalService } from '../../services/SavingGoal.service';
import { GoalContributionService } from '../../services/GoalContribution.service';
import { FinancialMovementService } from '../../services/FinancialMovement.service';
import { AchievementEventsService } from '../../services/achievement-events.service';
import { AchievementDTO } from '../../models/AchievementDTO';
import { UserAchievementDTO } from '../../models/UserAchievementDTO';
import { AddSavingGoalResponse } from '../../models/SavingGoal';
import { TransactionResponse } from '../../models/FinancialMovement';
import { Subscription } from 'rxjs';

interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  points: number;
  recentlyUnlocked?: boolean;
  triggerType: string;
  triggerValue: number;
}

interface AchievementCategory {
  name: string;
  icon: string;
  achievements: Achievement[];
}

interface UserProgress {
  totalSavings: number;
  completedGoals: number;
  totalContributions: number;
  consecutiveDays: number;
  totalGoals: number;
}

@Component({
  selector: 'app-achievements',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './achievements.component.html',
  styleUrls: ['./achievements.component.css']
})
export class AchievementsComponent implements OnInit, OnDestroy {
  achievements: AchievementDTO[] = [];
  userAchievements: UserAchievementDTO[] = [];
  filteredAchievements: Achievement[] = [];
  achievementCategories: AchievementCategory[] = [];

  userId: number = 0;
  isLoading = true;
  isLoadingUserAchievements = true;
  isLoadingProgress = false;
  selectedCategory = 'all';

  // User progress data
  userProgress: UserProgress = {
    totalSavings: 0,
    completedGoals: 0,
    totalContributions: 0,
    consecutiveDays: 0,
    totalGoals: 0
  };

  // Stats
  unlockedCount = 0;
  progressPercentage = 0;
  totalPoints = 0;

  modalAbierto = false;
  showConfetti = false;
  confettiArray: any[] = [];

  // All achievements from database
  allAchievements: Achievement[] = [];

  // Subscription for achievement refresh events
  private achievementRefreshSubscription?: Subscription;

  constructor(
    private achievementService: AchievementService,
    private savingGoalService: SavingGoalService,
    private goalContributionService: GoalContributionService,
    private financialMovementService: FinancialMovementService,
    private achievementEventsService: AchievementEventsService
  ) {}

  ngOnInit(): void {
    this.getCurrentUserId();
    this.loadAchievements();
    this.subscribeToAchievementEvents();
  }

  ngOnDestroy(): void {
    if (this.achievementRefreshSubscription) {
      this.achievementRefreshSubscription.unsubscribe();
    }
  }

  private subscribeToAchievementEvents(): void {
    this.achievementRefreshSubscription = this.achievementEventsService.achievementRefresh$.subscribe(() => {
      console.log('Achievement refresh event received, updating progress...');
      this.refreshProgress();
    });
  }

  private getCurrentUserId(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.userId = user.id;
    } else {
      console.error('No se encontró información del usuario');
      this.isLoading = false;
    }
  }

  loadAchievements(): void {
    this.isLoading = true;
    this.achievementService.getAllAchievements().subscribe({
      next: (data: AchievementDTO[]) => {
        console.log('Achievements from API:', data);
        this.achievements = data;
        this.mapAchievementsFromAPI();
        
        // Load user progress first, then user achievements
        this.loadUserProgress();
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading achievements:', error);
        this.isLoading = false;
        // Load sample data as fallback
        this.loadSampleAchievements();
        this.loadUserProgress();
      }
    });
  }

  // Public method to refresh progress (can be called from other components)
  refreshProgress(): void {
    console.log('Refreshing achievements progress...');
    this.loadUserProgress();
  }

  loadUserProgress(): void {
    if (!this.userId) {
      this.updateAchievementsStatus();
      return;
    }

    this.isLoadingProgress = true;
    console.log('Loading user progress for userId:', this.userId);

    // Load saving goals to calculate progress
    this.savingGoalService.listSavingGoals().subscribe({
      next: (goals: AddSavingGoalResponse[]) => {
        console.log('User goals for progress calculation:', goals);
        
        // Calculate total savings and completed goals
        this.userProgress.totalSavings = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
        this.userProgress.completedGoals = goals.filter(goal => goal.currentAmount >= goal.targetAmount).length;
        this.userProgress.totalGoals = goals.length;

        console.log('Calculated progress:', {
          totalSavings: this.userProgress.totalSavings,
          completedGoals: this.userProgress.completedGoals,
          totalGoals: this.userProgress.totalGoals
        });

        // Load contributions to calculate total contributions
        this.loadContributions();
      },
      error: (error) => {
        console.error('Error loading goals for progress:', error);
        this.loadContributions();
      }
    });
  }

  loadContributions(): void {
    // Try to load actual contributions from the service
    this.goalContributionService.getHistory().subscribe({
      next: (contributions: any[]) => {
        console.log('User contributions:', contributions);
        this.userProgress.totalContributions = contributions.length;
        this.userProgress.consecutiveDays = this.calculateConsecutiveDays(contributions);
        
        console.log('Final progress data:', this.userProgress);
        this.updateAchievementsStatus();
        this.isLoadingProgress = false;
        
        // Load user achievements after progress is calculated
        this.loadUserAchievements();
      },
      error: (error) => {
        console.error('Error loading contributions, using estimate:', error);
        // Fallback to estimation
        this.userProgress.totalContributions = Math.floor(this.userProgress.totalSavings / 50);
        this.userProgress.consecutiveDays = this.calculateConsecutiveDays([]);
        
        console.log('Using estimated progress data:', this.userProgress);
        this.updateAchievementsStatus();
        this.isLoadingProgress = false;
        
        // Load user achievements after progress is calculated
        this.loadUserAchievements();
      }
    });
  }

  calculateConsecutiveDays(contributions: any[]): number {
    if (contributions.length === 0) {
      return Math.min(7, Math.floor(this.userProgress.totalContributions / 2));
    }

    // Calculate consecutive days based on contribution dates
    const sortedContributions = contributions
      .map(c => new Date(c.date))
      .sort((a, b) => b.getTime() - a.getTime());

    let consecutiveDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedContributions.length; i++) {
      const contributionDate = new Date(sortedContributions[i]);
      contributionDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today.getTime() - contributionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === consecutiveDays) {
        consecutiveDays++;
      } else {
        break;
      }
    }

    return consecutiveDays;
  }

  mapAchievementsFromAPI(): void {
    this.allAchievements = this.achievements.map(achievement => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      icon: this.getAchievementIcon(achievement.triggerType),
      category: this.getAchievementCategory(achievement.triggerType),
      unlocked: false, // Will be updated when user achievements are loaded
      progress: 0, // Will be calculated based on user progress
      points: this.calculatePointsByType(achievement.triggerType, achievement.triggerValue),
      triggerType: achievement.triggerType,
      triggerValue: achievement.triggerValue
    }));
  }

  calculatePointsByType(triggerType: string, triggerValue: number): number {
    switch (triggerType) {
      case 'GOAL_COMPLETED':
        if (triggerValue === 1) return 50;      // Primer Ahorro
        if (triggerValue === 2) return 100;     // Meta Doble
        if (triggerValue === 3) return 150;     // Meta Triple
        if (triggerValue === 10) return 500;    // Veterano
        return 100;
      
      case 'CONTRIBUTION_COUNT':
        if (triggerValue === 1) return 25;      // Ahorrador Inicial
        if (triggerValue === 5) return 75;      // Constancia 5
        return 50;
      
      case 'TOTAL_SAVED':
        if (triggerValue === 100) return 150;   // Ahorro de 100
        if (triggerValue === 500) return 200;   // Ahorro de 500
        if (triggerValue === 1000) return 300;  // Super Ahorro
        return 100;
      
      case 'STREAK_DAYS':
        if (triggerValue === 7) return 100;     // Racha de 7 días
        return 75;
      
      default:
        return 50;
    }
  }

  loadUserAchievements(): void {
    if (!this.userId) {
      this.isLoadingUserAchievements = false;
      this.updateAchievementsStatus();
      return;
    }

    this.isLoadingUserAchievements = true;
    console.log('Loading user achievements for userId:', this.userId);
    
    this.achievementService.getUserAchievements(this.userId).subscribe({
      next: (data: UserAchievementDTO[]) => {
        console.log('User achievements from API:', data);
        this.userAchievements = data;
        
        // Debug: Show all available achievements and user achievements
        this.debugAchievementMatching();
        
        this.updateAchievementsStatus();
        this.isLoadingUserAchievements = false;
      },
      error: (error) => {
        console.error('Error loading user achievements:', error);
        this.userAchievements = [];
        this.updateAchievementsStatus();
        this.isLoadingUserAchievements = false;
      }
    });
  }

  debugAchievementMatching(): void {
    console.log('=== ACHIEVEMENT DEBUG INFO ===');
    console.log('Available achievements:');
    this.allAchievements.forEach(achievement => {
      console.log(`- ${achievement.name} (ID: ${achievement.id})`);
    });
    
    console.log('User unlocked achievements:');
    this.userAchievements.forEach(userAchievement => {
      console.log(`- ${userAchievement.achievementName} (Description: ${userAchievement.achievementDescription})`);
    });
    
    console.log('=== END DEBUG INFO ===');
  }

  updateAchievementsStatus(): void {
    console.log('Updating achievements status with progress:', this.userProgress);
    console.log('User achievements from database:', this.userAchievements);
    console.log('All achievements loaded:', this.allAchievements);
    
    // Mark achievements as unlocked based on user achievements from database
    this.allAchievements.forEach(achievement => {
      // Try multiple matching strategies
      let userAchievement = this.userAchievements.find(ua => 
        ua.achievementName === achievement.name
      );
      
      // If not found by exact name, try by partial name match
      if (!userAchievement) {
        userAchievement = this.userAchievements.find(ua => 
          achievement.name.toLowerCase().includes(ua.achievementName.toLowerCase()) ||
          ua.achievementName.toLowerCase().includes(achievement.name.toLowerCase())
        );
      }
      
      // If still not found, try by description match
      if (!userAchievement) {
        userAchievement = this.userAchievements.find(ua => 
          ua.achievementDescription === achievement.description
        );
      }
      
      if (userAchievement) {
        // Achievement is already unlocked in database
        achievement.unlocked = true;
        achievement.unlockedAt = userAchievement.unlockedAt;
        achievement.progress = 100;
        console.log(`Achievement "${achievement.name}" is unlocked (from database) - matched with: ${userAchievement.achievementName}`);
      } else {
        // Check if achievement should be unlocked based on current progress
        const shouldUnlock = this.shouldUnlockAchievement(achievement);
        
        if (shouldUnlock) {
          // Auto-unlock based on current progress
          achievement.unlocked = true;
          achievement.unlockedAt = new Date().toISOString();
          achievement.progress = 100;
          console.log(`Achievement "${achievement.name}" auto-unlocked based on progress`);
        } else {
          // Not unlocked yet, calculate progress
          achievement.unlocked = false;
          achievement.progress = this.calculateRealProgress(achievement);
          console.log(`Achievement "${achievement.name}" progress: ${achievement.progress}%`);
        }
      }
    });

    this.updateStats();
    this.updateCategories();
    this.filterAchievements();
  }

  calculateRealProgress(achievement: Achievement): number {
    let progress = 0;
    
    switch (achievement.triggerType) {
      case 'GOAL_COMPLETED':
        progress = Math.min(100, (this.userProgress.completedGoals / achievement.triggerValue) * 100);
        break;
      
      case 'CONTRIBUTION_COUNT':
        progress = Math.min(100, (this.userProgress.totalContributions / achievement.triggerValue) * 100);
        break;
      
      case 'TOTAL_SAVED':
        progress = Math.min(100, (this.userProgress.totalSavings / achievement.triggerValue) * 100);
        break;
      
      case 'STREAK_DAYS':
        progress = Math.min(100, (this.userProgress.consecutiveDays / achievement.triggerValue) * 100);
        break;
      
      default:
        progress = 0;
    }
    
    return Math.round(progress);
  }

  calculatePoints(triggerValue: number): number {
    // Calculate points based on achievement difficulty and type
    // This should match the points shown in the sample data
    if (triggerValue <= 1) return 25;      // First time achievements
    if (triggerValue <= 2) return 50;      // Early goals
    if (triggerValue <= 3) return 75;      // Small milestones
    if (triggerValue <= 5) return 100;     // Medium milestones
    if (triggerValue <= 7) return 150;     // Consistency achievements
    if (triggerValue <= 10) return 200;    // Advanced goals
    if (triggerValue <= 100) return 150;   // Small savings
    if (triggerValue <= 500) return 200;   // Medium savings
    if (triggerValue <= 1000) return 300;  // Large savings
    return 500;                            // Veteran achievements
  }

  getAchievementIcon(triggerType: string): string {
    const iconMap: { [key: string]: string } = {
      'GOAL_COMPLETED': '🏆',
      'CONTRIBUTION_COUNT': '💰',
      'TOTAL_SAVED': '💸',
      'STREAK_DAYS': '🔥'
    };
    return iconMap[triggerType] || '🏅';
  }

  getAchievementCategory(triggerType: string): string {
    if (triggerType === 'TOTAL_SAVED') {
      return 'savings';
    } else if (triggerType === 'GOAL_COMPLETED') {
      return 'goals';
    } else if (triggerType === 'CONTRIBUTION_COUNT' || triggerType === 'STREAK_DAYS') {
      return 'consistency';
    }
    return 'savings';
  }

  loadSampleAchievements(): void {
    // Fallback achievements if API fails
    this.allAchievements = [
      {
        id: 1,
        name: 'Primer Ahorro',
        description: 'Completaste tu primer objetivo de ahorro',
        icon: '🥇',
        category: 'goals',
        unlocked: false,
        progress: 75,
        points: 50,
        triggerType: 'GOAL_COMPLETED',
        triggerValue: 1
      },
      {
        id: 2,
        name: 'Ahorrador Inicial',
        description: 'Contribuiste por primera vez',
        icon: '💰',
        category: 'consistency',
        unlocked: false,
        progress: 60,
        points: 25,
        triggerType: 'CONTRIBUTION_COUNT',
        triggerValue: 1
      },
      {
        id: 3,
        name: 'Constancia 5',
        description: 'Contribuiste 5 veces',
        icon: '🔁',
        category: 'consistency',
        unlocked: false,
        progress: 40,
        points: 75,
        triggerType: 'CONTRIBUTION_COUNT',
        triggerValue: 5
      },
      {
        id: 4,
        name: 'Meta Doble',
        description: 'Completaste 2 metas',
        icon: '🏆',
        category: 'goals',
        unlocked: false,
        progress: 50,
        points: 100,
        triggerType: 'GOAL_COMPLETED',
        triggerValue: 2
      },
      {
        id: 5,
        name: 'Ahorro de 100',
        description: 'Ahorraste 100 soles en total',
        icon: '💸',
        category: 'savings',
        unlocked: false,
        progress: 30,
        points: 150,
        triggerType: 'TOTAL_SAVED',
        triggerValue: 100
      },
      {
        id: 6,
        name: 'Ahorro de 500',
        description: 'Ahorraste 500 soles en total',
        icon: '🤑',
        category: 'savings',
        unlocked: false,
        progress: 15,
        points: 200,
        triggerType: 'TOTAL_SAVED',
        triggerValue: 500
      },
      {
        id: 7,
        name: 'Meta Triple',
        description: 'Completaste 3 metas',
        icon: '🥉',
        category: 'goals',
        unlocked: false,
        progress: 25,
        points: 150,
        triggerType: 'GOAL_COMPLETED',
        triggerValue: 3
      },
      {
        id: 8,
        name: 'Racha de 7 días',
        description: 'Contribuiste 7 días seguidos',
        icon: '🔥',
        category: 'consistency',
        unlocked: false,
        progress: 20,
        points: 100,
        triggerType: 'STREAK_DAYS',
        triggerValue: 7
      },
      {
        id: 9,
        name: 'Super Ahorro',
        description: 'Ahorraste más de 1000 soles',
        icon: '🚀',
        category: 'savings',
        unlocked: false,
        progress: 10,
        points: 300,
        triggerType: 'TOTAL_SAVED',
        triggerValue: 1000
      },
      {
        id: 10,
        name: 'Veterano',
        description: '10 metas completadas',
        icon: '🎖',
        category: 'goals',
        unlocked: false,
        progress: 5,
        points: 500,
        triggerType: 'GOAL_COMPLETED',
        triggerValue: 10
      }
    ];
    this.updateStats();
    this.updateCategories();
    this.filterAchievements();
  }

  checkAchievements(): void {
    if (!this.userId) {
      console.error('No user ID available');
      return;
    }

    this.isLoading = true;
    console.log('Checking achievements for user:', this.userId);
    
    // First, update user progress to ensure we have the latest data
    this.loadUserProgress();
    
    // Then check achievements with the backend
    this.achievementService.checkAchievements(this.userId).subscribe({
      next: () => {
        console.log('Achievements checked successfully');
        
        // After checking, automatically unlock achievements based on current progress
        this.autoUnlockAchievements();
        
        // Reload user achievements to get the updated state
        this.loadUserAchievements();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error checking achievements:', error);
        this.isLoading = false;
        
        // Even if backend check fails, try to auto-unlock based on current progress
        this.autoUnlockAchievements();
      }
    });
  }

  autoUnlockAchievements(): void {
    console.log('Auto-unlocking achievements based on current progress:', this.userProgress);
    
    const newlyUnlocked: Achievement[] = [];
    
    this.allAchievements.forEach(achievement => {
      const shouldUnlock = this.shouldUnlockAchievement(achievement);
      
      if (shouldUnlock && !achievement.unlocked) {
        console.log(`Auto-unlocking achievement: ${achievement.name}`);
        achievement.unlocked = true;
        achievement.unlockedAt = new Date().toISOString();
        achievement.progress = 100;
        achievement.recentlyUnlocked = true;
        
        newlyUnlocked.push(achievement);
        
        // Show confetti for newly unlocked achievements
        this.lanzarConfetti();
        
        // Show success message
        setTimeout(() => {
          achievement.recentlyUnlocked = false;
        }, 3000);
      }
    });
    
    // Sync newly unlocked achievements with backend
    if (newlyUnlocked.length > 0) {
      this.syncUnlockedAchievements(newlyUnlocked);
    }
    
    this.updateStats();
    this.updateCategories();
    this.filterAchievements();
  }

  syncUnlockedAchievements(achievements: Achievement[]): void {
    console.log('Syncing unlocked achievements with backend:', achievements.map(a => a.name));
    
    // Sync each unlocked achievement with the backend
    achievements.forEach(achievement => {
      console.log(`Syncing achievement: ${achievement.name} unlocked at ${achievement.unlockedAt}`);
      
      if (achievement.unlockedAt) {
        this.achievementService.syncAchievement(this.userId, achievement.id, achievement.unlockedAt).subscribe({
          next: () => {
            console.log(`Successfully synced achievement: ${achievement.name}`);
          },
          error: (error) => {
            console.error(`Error syncing achievement ${achievement.name}:`, error);
          }
        });
      }
    });
  }

  shouldUnlockAchievement(achievement: Achievement): boolean {
    switch (achievement.triggerType) {
      case 'GOAL_COMPLETED':
        return this.userProgress.completedGoals >= achievement.triggerValue;
      
      case 'CONTRIBUTION_COUNT':
        return this.userProgress.totalContributions >= achievement.triggerValue;
      
      case 'TOTAL_SAVED':
        return this.userProgress.totalSavings >= achievement.triggerValue;
      
      case 'STREAK_DAYS':
        return this.userProgress.consecutiveDays >= achievement.triggerValue;
      
      default:
        return false;
    }
  }

  updateStats(): void {
    const unlocked = this.allAchievements.filter(a => a.unlocked);
    this.unlockedCount = unlocked.length;
    this.progressPercentage = Math.round((this.unlockedCount / this.allAchievements.length) * 100);
    this.totalPoints = unlocked.reduce((sum, a) => sum + a.points, 0);
  }

  updateCategories(): void {
    this.achievementCategories = [
      {
        name: 'Ahorros',
        icon: 'piggy-bank',
        achievements: this.allAchievements.filter(a => a.category === 'savings')
      },
      {
        name: 'Metas',
        icon: 'target',
        achievements: this.allAchievements.filter(a => a.category === 'goals')
      },
      {
        name: 'Constancia',
        icon: 'flame',
        achievements: this.allAchievements.filter(a => a.category === 'consistency')
      }
    ];
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.filterAchievements();
  }

  filterAchievements(): void {
    if (this.selectedCategory === 'all') {
      this.filteredAchievements = this.allAchievements;
    } else {
      this.filteredAchievements = this.allAchievements.filter(a => a.category === this.selectedCategory);
    }
  }

  abrirModal() {
    this.modalAbierto = true;
  }

  cerrarModal() {
    this.modalAbierto = false;
  }

  lanzarConfetti() {
    this.confettiArray = Array.from({length: 20}).map(() => ({
      left: Math.random() * 90 + '%',
      background: `hsl(${Math.random()*360}, 80%, 60%)`,
      animationDelay: (Math.random() * 0.5) + 's'
    }));
    this.showConfetti = true;
    setTimeout(() => this.showConfetti = false, 1300);
  }

  desbloquearLogro(id: number) {
    const logro = this.allAchievements.find(l => l.id === id);
    if (logro && !logro.unlocked) {
      logro.unlocked = true;
      logro.recentlyUnlocked = true;
      logro.unlockedAt = new Date().toISOString();
      logro.progress = 100;
      this.lanzarConfetti();
      this.updateStats();
      this.filterAchievements();
      
      setTimeout(() => {
        if (logro) logro.recentlyUnlocked = false;
      }, 3000);
    }
  }

  trackByAchievement(index: number, achievement: Achievement): number {
    return achievement.id;
  }
}
