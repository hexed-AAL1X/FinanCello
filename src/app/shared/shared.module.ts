// src/app/shared/shared.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { HeaderComponent } from './layout/header/header.component';

@NgModule({
  declarations: [],
  imports: [CommonModule, SidebarComponent, HeaderComponent],
  exports: [SidebarComponent, HeaderComponent]
})
export class SharedModule {}
