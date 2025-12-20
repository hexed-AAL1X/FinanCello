export enum RoleType {
  ADMIN = 'ADMIN',
  BASIC = 'BASIC'
}

export interface RoleRequest {
  roleType: RoleType;
}

export interface RoleResponse {
  id: number;
  roleType: RoleType;
}
