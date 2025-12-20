import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  private snackbarSubject = new Subject<{
    title: string,
    message: string,
    icon?: string,
    showUndo?: boolean
  }>();

  snackbarState$ = this.snackbarSubject.asObservable();

  showSnackbar(title: string, message: string, icon: string = '', showUndo = false) {
    this.snackbarSubject.next({ title, message, icon, showUndo });
  }
}
