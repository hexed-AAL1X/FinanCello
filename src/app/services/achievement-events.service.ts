import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AchievementEventsService {
  private achievementRefreshSubject = new Subject<void>();
  public achievementRefresh$ = this.achievementRefreshSubject.asObservable();

  constructor() { }

  // Method to trigger achievement refresh from other components
  triggerAchievementRefresh(): void {
    console.log('Triggering achievement refresh...');
    this.achievementRefreshSubject.next();
  }

  // Method to trigger refresh after contribution
  triggerContributionRefresh(): void {
    console.log('Contribution made, triggering achievement refresh...');
    this.achievementRefreshSubject.next();
  }

  // Method to trigger refresh after goal completion
  triggerGoalCompletionRefresh(): void {
    console.log('Goal completed, triggering achievement refresh...');
    this.achievementRefreshSubject.next();
  }
} 