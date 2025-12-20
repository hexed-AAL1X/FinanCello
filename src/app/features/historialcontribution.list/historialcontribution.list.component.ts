import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewcategoryFormComponent } from '../../features/newcategory.form/newcategory.form.component';

@Component({
  selector: 'app-historialcontribution-list',
  standalone: true,
  imports: [CommonModule, NewcategoryFormComponent],
  templateUrl: './historialcontribution.list.component.html',
  styleUrls: ['./historialcontribution.list.component.css']
})
export class HistorialContributionListComponent {
  showModal = false;

  openModal() {
    console.log('openModal called');
    this.showModal = true;
    console.log('showModal is now:', this.showModal);
  }

  closeModal() {
    console.log('closeModal called');
    this.showModal = false;
  }
}

