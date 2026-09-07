import { Component } from '@angular/core';
import { FinancialMovementService } from '../../../../services/FinancialMovement.service';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

interface FileUpload {
  id: string;
  file: File;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  uploadedAt?: Date;
}

@Component({
  selector: 'app-movement-upload',
  standalone: true,
  templateUrl: './movement-upload.component.html',
  styleUrls: ['./movement-upload.component.css'],
  imports: [CommonModule, LucideAngularModule]
})
export class MovementUploadComponent {
  isDragging = false;
  selectedFile: File | null = null;
  isUploading = false;
  uploadSuccess = false;
  uploadError: string | null = null;
  uploadedFiles: FileUpload[] = [];

  constructor(private financialService: FinancialMovementService) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  upload() {
    if (!this.selectedFile) return;

    const fileUpload: FileUpload = {
      id: Date.now().toString(),
      file: this.selectedFile,
      status: 'uploading'
    };

    this.uploadedFiles.unshift(fileUpload);
    this.isUploading = true;
    this.uploadSuccess = false;
    this.uploadError = null;

    this.financialService.uploadExcel(this.selectedFile).subscribe({
      next: () => {
        fileUpload.status = 'success';
        fileUpload.uploadedAt = new Date();
        this.uploadSuccess = true;
        this.selectedFile = null;
      },
      error: (err) => {
        fileUpload.status = 'error';
        fileUpload.error = err.error || 'Error al cargar';
        this.uploadError = err.error || 'Error al cargar el archivo';
      },
      complete: () => {
        this.isUploading = false;
      },
    });
  }

  removeFile(fileId: string) {
    this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== fileId);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'uploading': return 'status-uploading';
      case 'success': return 'status-success';
      case 'error': return 'status-error';
      default: return 'status-uploading';
    }
  }

  getFileIcon(fileName: string): string {
    if (fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls')) {
      return 'assets/icons/file-xls.svg';
    } else if (fileName.toLowerCase().endsWith('.csv')) {
      return 'assets/icons/file-csv.svg';
    }
    return 'assets/icons/file.svg';
  }

  getFileName(fileName: string): string {
    return fileName.replace(/\.[^/.]+$/, '');
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'Fecha no disponible';
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  formatTableDate(date: Date | undefined): string {
    if (!date) return '—';
    return date.toLocaleDateString('es-ES');
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'uploading': return 'Procesando';
      case 'success': return 'Cargado';
      case 'error': return 'Fallido';
      default: return 'Desconocido';
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
        this.selectedFile = file;
        this.uploadSuccess = false;
        this.uploadError = null;
        this.upload();
      } else {
        this.uploadError = 'Solo archivos .xlsx o .csv';
      }
    }
    input.value = '';
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;

    if (event.dataTransfer?.files.length) {
      const file = event.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
        this.selectedFile = file;
        this.uploadSuccess = false;
        this.uploadError = null;
        this.upload();
      } else {
        this.uploadError = 'Solo archivos .xlsx o .csv';
      }
    }
  }
}
