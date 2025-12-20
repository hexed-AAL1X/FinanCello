import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NewcategoryFormComponent } from '../newcategory.form/newcategory.form.component';

interface Categoria {
  name: string;
  description: string;
}

@Component({
  selector: 'app-historialcontribution-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NewcategoryFormComponent],
  templateUrl: './historialcontribution.form.component.html',
  styleUrls: ['./historialcontribution.form.component.css']
})
export class HistorialContributionFormComponent {
  showModal = false;
  contributionForm: FormGroup;

  // Lista de categorías en memoria
  categorias: Categoria[] = [
    { name: 'Primera Categoría', description: 'Descripción de la primera categoría' },
    { name: 'Segunda Categoría', description: 'Descripción de la segunda categoría' },
    { name: 'Tercera Categoría', description: 'Descripción de la tercera categoría' }
  ];

  // NUEVO: Propiedades para la categoría seleccionada y sus movimientos
  selectedCategoria: Categoria | null = null;
  selectedCategoriaIndex: number | null = null;

  // NUEVO: Descripciones para las categorías (ajustadas para las 3 primeras)
  categoriaDescripciones: string[] = [
    'Gastos primarios de mi vida cotidiana',
    'Gastos secundarios de mi vida cotidiana',
    'Gastos terciarios de mi vida cotidiana'
  ];

  // NUEVO: Movimientos de ejemplo para cada categoría
  movimientosPorCategoria: any[] = [
    [
      { fecha: '20/04/2025', descripcion: 'Compra de comestibles (La Canasta)', monto: '-$250.00' },
      { fecha: '21/04/2025', descripcion: 'Factura de luz y agua', monto: '-$120.00' },
      { fecha: '22/04/2025', descripcion: 'Alquiler de apartamento', monto: '-$800.00' },
      { fecha: '23/04/2025', descripcion: 'Consulta médica general', monto: '-$90.00' },
      { fecha: '24/04/2025', descripcion: 'Compra de medicamentos (Farmacia)', monto: '-$45.00' },
      { fecha: '25/04/2025', descripcion: 'Pago mensual de transporte público', monto: '-$50.00' },
      { fecha: '26/04/2025', descripcion: 'Pago de internet en casa', monto: '-$60.00' }
    ],
    [
      { fecha: '20/04/2025', descripcion: 'Cena en restaurante', monto: '-$60.00' },
      { fecha: '21/04/2025', descripcion: 'Cine', monto: '-$30.00' }
    ],
    [
      { fecha: '22/04/2025', descripcion: 'Compra de videojuego', monto: '-$70.00' }
    ]
  ];

  constructor(private fb: FormBuilder, private router: Router) {
    this.contributionForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(1)]],
      description: ['', Validators.required],
      category: ['', Validators.required],
      date: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.contributionForm.valid) {
      console.log('Formulario enviado:', this.contributionForm.value);
      // Aquí podrías llamar a un servicio para guardar la contribución
    } else {
      console.log('Formulario inválido');
    }
  }

  goToNewCategory() {
    this.showModal = true;
  }

  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  // Método para agregar una nueva categoría
  addCategory(name: string, description: string) {
    this.categorias.push({ name, description });
    this.categoriaDescripciones.push(description || 'Sin descripción');
    this.movimientosPorCategoria.push([]);
  }

  // NUEVO: Método para seleccionar una categoría
  onCategoriaClick(categoria: Categoria, index: number) {
    this.selectedCategoria = categoria;
    this.selectedCategoriaIndex = index;
    console.log('Categoría seleccionada:', categoria, 'Índice:', index);
  }
}




