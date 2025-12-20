import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/Auth.service';
import { UserWithRoleResponse } from '../../../models/User';

@Component({
  selector: 'app-dashboard-admin',
  templateUrl: './dashboardAdmin.component.html',
  styleUrls: ['./dashboardAdmin.Component.css'],
  imports: [CommonModule, FormsModule]
})
export class DashboardAdminComponent implements OnInit {
  users: UserWithRoleResponse[] = [];
  filteredUsers: UserWithRoleResponse[] = [];
  isLoading = false;
  errorMessage = '';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 8;
  totalItems = 0;
  
  // Sorting
  sortField: keyof UserWithRoleResponse = 'firstName';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Filtering
  searchTerm = '';
  roleFilter = '';
  
  // Available roles for filtering
  availableRoles: string[] = [];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.getAllUsers().subscribe({
      next: (users) => {
        console.log('Users loaded:', users);
        this.users = users;
        this.filteredUsers = [...users];
        this.totalItems = users.length;
        
        // Extract unique roles for filtering
        this.availableRoles = [...new Set(users.map(user => user.role))];
        
        this.applyFiltersAndSorting();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.errorMessage = 'Error loading users. Please try again.';
        this.isLoading = false;
      }
    });
  }

  applyFiltersAndSorting(): void {
    let filtered = [...this.users];

    // Apply search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply role filter
    if (this.roleFilter) {
      filtered = filtered.filter(user => user.role === this.roleFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[this.sortField];
      const bValue = b[this.sortField];
      
      if (aValue < bValue) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    this.filteredUsers = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1; // Reset to first page when filtering
  }

  onSearchChange(): void {
    this.applyFiltersAndSorting();
  }

  onRoleFilterChange(): void {
    this.applyFiltersAndSorting();
  }

  onSort(field: keyof UserWithRoleResponse): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFiltersAndSorting();
  }

  getPaginatedUsers(): UserWithRoleResponse[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredUsers.slice(startIndex, endIndex);
  }

  getTotalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    this.itemsPerPage = itemsPerPage;
    this.currentPage = 1;
  }

  getDisplayRange(): string {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
    return `${start}-${end} of ${this.totalItems}`;
  }

  getUserFullName(user: UserWithRoleResponse): string {
    return `${user.lastName}, ${user.firstName}`;
  }

  getUserInitials(user: UserWithRoleResponse): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }

  getUserRoleClass(role: string): string {
    return role.toLowerCase() === 'admin' ? 'admin-role' : 'basic-role';
  }

  onUserAction(user: UserWithRoleResponse, action: string): void {
    console.log(`Action ${action} for user:`, user);
    // Implement specific actions like edit, delete, etc.
    switch (action) {
      case 'edit':
        this.editUser(user);
        break;
      case 'delete':
        this.deleteUser(user);
        break;
      case 'view':
        this.viewUser(user);
        break;
    }
  }

  editUser(user: UserWithRoleResponse): void {
    console.log('Edit user:', user);
    // Implement edit functionality
  }

  deleteUser(user: UserWithRoleResponse): void {
    console.log('Delete user:', user);
    // Implement delete functionality
  }

  viewUser(user: UserWithRoleResponse): void {
    console.log('View user:', user);
    // Implement view functionality
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.roleFilter = '';
    this.applyFiltersAndSorting();
  }
}
