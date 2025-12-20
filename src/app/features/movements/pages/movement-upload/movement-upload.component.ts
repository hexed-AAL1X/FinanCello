import { Component } from '@angular/core';
import { FinancialMovementService } from '../../../../services/FinancialMovement.service';
import { CommonModule } from '@angular/common';

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
  imports: [CommonModule]
})
export class MovementUploadComponent {
  isDragging = false;
  selectedFile: File | null = null;
  isUploading = false;
  uploadSuccess = false;
  uploadError: string | null = null;
  uploadedFiles: FileUpload[] = [];

  constructor(private financialService: FinancialMovementService) {
    // No cargar archivos del localStorage al reiniciar la página
    // this.loadUploadedFiles();
  }

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
        fileUpload.error = err.error || 'Error on upload';
        this.uploadError = err.error || 'Error on upload';
      },
      complete: () => {
        this.isUploading = false;
      },
    });
  }

  removeFile(fileId: string) {
    this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== fileId);
  }

  private loadUploadedFiles() {
    const savedFiles = localStorage.getItem('uploadedFiles');
    if (savedFiles) {
      try {
        const files = JSON.parse(savedFiles);
        this.uploadedFiles = files.map((file: any) => ({
          ...file,
          uploadedAt: file.uploadedAt ? new Date(file.uploadedAt) : undefined
        }));
      } catch (error) {
        console.error('Error loading uploaded files:', error);
      }
    }
  }

  private saveUploadedFiles() {
    localStorage.setItem('uploadedFiles', JSON.stringify(this.uploadedFiles));
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
      case 'uploading': return 'date3'; 
      case 'success': return 'date5'; 
      case 'error': return 'date4'; 
      default: return 'date3';
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

  getFileNameClass(index: number): string {
    const classes = ['gastos-t-1', 'marketing-oportunid', 'run-name', 'country-travel', 'job-income'];
    return classes[index] || 'gastos-t-1';
  }

  getDateClass(index: number): string {
    const classes = ['dec-24-2025', 'dec-21-2025', 'nov-28-2025', 'oct-29-2025', 'sept-29-2025'];
    return classes[index] || 'dec-24-2025';
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'Fecha no disponible';
    
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${month} ${day}, ${year}`;
  }

  formatTableDate(date: Date | undefined): string {
    if (!date) return '-';
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().length === 1 ? 
      '0' + (date.getMonth() + 1) : (date.getMonth() + 1).toString();
    const day = date.getDate().toString().length === 1 ? 
      '0' + date.getDate() : date.getDate().toString();
    
    return `${year}-${month}-${day}`;
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'uploading': return 'Processing';
      case 'success': return 'Uploaded';
      case 'error': return 'Failed';
      default: return 'Unknown';
    }
  }

  getEmptyRows(): any[] {
    const maxRows = 3;
    const emptyRows = maxRows - this.uploadedFiles.length;
    return emptyRows > 0 ? Array(emptyRows).fill(null) : [];
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
