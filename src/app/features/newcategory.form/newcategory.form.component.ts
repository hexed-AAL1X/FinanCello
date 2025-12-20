import { Component, EventEmitter, Output, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-newcategory-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './newcategory.form.component.html',
  styleUrls: ['./newcategory.form.component.css']
})
export class NewcategoryFormComponent {
  @Output() close = new EventEmitter<void>();
  @Output() categoryCreated = new EventEmitter<{ name: string; description: string }>();
  @ViewChild('nameInput') nameInput!: ElementRef;
  @ViewChild('descriptionInput') descriptionInput!: ElementRef;

  categoryName: string = '';
  categoryDescription: string = '';
  showSuccess: boolean = false;
  showNameDuplicated: boolean = false;

  constructor() {
    console.log('NewcategoryFormComponent constructor called');
  }

  onClose() {
    console.log('onClose called');
    this.close.emit();
  }

  focusName() {
    this.nameInput.nativeElement.focus();
  }

  focusDescription() {
    this.descriptionInput.nativeElement.focus();
  }

  saveCategory() {
    if (this.categoryName.trim() === '') {
      alert('Por favor ingresa un nombre para la categoría');
      return;
    }

    // Simular validación de nombre duplicado
    if (this.categoryName.toLowerCase() === 'alimentación' || 
        this.categoryName.toLowerCase() === 'transporte' || 
        this.categoryName.toLowerCase() === 'entretenimiento') {
      this.showNameDuplicated = true;
      setTimeout(() => {
        this.showNameDuplicated = false;
      }, 3000);
      return;
    }

    // Si no está duplicado, mostrar éxito y emitir evento
    this.showSuccess = true;
    this.categoryCreated.emit({
      name: this.categoryName,
      description: this.categoryDescription
    });
    setTimeout(() => {
      this.showSuccess = false;
      this.onClose();
    }, 2000);
  }

  showNameDuplicatedMessage() {
    this.showNameDuplicated = true;
    setTimeout(() => {
      this.showNameDuplicated = false;
    }, 3000);
  }
}
