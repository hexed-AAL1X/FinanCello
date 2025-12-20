import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  templateUrl: './snackbar.component.html',
  styleUrls: ['./snackbar.component.css'],
  imports: [NgIf]
})
export class SnackbarComponent implements OnInit {
  @Input() title: string = '';
  @Input() message: string = '';
  @Input() icon: string = '';
  @Input() showUndo: boolean = false;

  @Output() undoClicked = new EventEmitter<void>();
  
  visible = true;
  isHiding = false;

  ngOnInit() {
    setTimeout(() => {
      this.isHiding = true;
      setTimeout(() => {
        this.visible = false;
      }, 400);
    }, 3000);
  }

  onUndoSnackbar() {
    this.isHiding = true;
    setTimeout(() => {
      this.visible = false;
      this.undoClicked.emit();
    }, 300);
  }
}
