/**
 * Multi-User Authentication and Authorization System
 * 
 * Uses Supabase Auth for user management with role-based access control
 */

import { supabase } from './supabase';

export type UserRole = 'admin' | 'manager' | 'agent' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

/**
 * Role-based permissions matrix
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    { resource: '*', actions: ['create', 'read', 'update', 'delete'] }
  ],
  manager: [
    { resource: 'leads', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'campaigns', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'templates', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'analytics', actions: ['read'] },
    { resource: 'webhooks', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'users', actions: ['read'] }
  ],
  agent: [
    { resource: 'leads', actions: ['create', 'read', 'update'] },
    { resource: 'campaigns', actions: ['create', 'read', 'update'] },
    { resource: 'templates', actions: ['read'] },
    { resource: 'analytics', actions: ['read'] }
  ],
  viewer: [
    { resource: 'leads', actions: ['read'] },
    { resource: 'campaigns', actions: ['read'] },
    { resource: 'templates', actions: ['read'] },
    { resource: 'analytics', actions: ['read'] }
  ]
};

/**
 * Sign up new user
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: UserRole = 'agent'
): Promise<{ user: any; error: any }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role
      }
    }
  });

  if (error) return { user: null, error };

  // Create user profile
  if (data.user) {
    await createUserProfile(data.user.id, email, fullName, role);
  }

  return { user: data.user, error: null };
}

/**
 * Sign in user
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ user: any; session: any; error: any }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) return { user: null, session: null, error };

  // Update last login
  if (data.user) {
    await updateLastLogin(data.user.id);
  }

  return { user: data.user, session: data.session, error: null };
}

/**
 * Sign out user
 */
export async function signOut(): Promise<{ error: any }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<any> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get current session
 */
export async function getCurrentSession(): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Create user profile
 */
async function createUserProfile(
  userId: string,
  email: string,
  fullName: string,
  role: UserRole
): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      email,
      full_name: fullName,
      role,
      is_active: true
    });

  if (error) {
    console.error('Error creating user profile:', error);
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role,
    avatar: data.avatar,
    isActive: data.is_active,
    lastLogin: data.last_login,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'fullName' | 'role' | 'avatar' | 'isActive'>>
): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({
      full_name: updates.fullName,
      role: updates.role,
      avatar: updates.avatar,
      is_active: updates.isActive
    })
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Update last login timestamp
 */
async function updateLastLogin(userId: string): Promise<void> {
  await supabase
    .from('user_profiles')
    .update({ last_login: new Date().toISOString() })
    .eq('id', userId);
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return (data || []).map(d => ({
    id: d.id,
    email: d.email,
    fullName: d.full_name,
    role: d.role,
    avatar: d.avatar,
    isActive: d.is_active,
    lastLogin: d.last_login,
    createdAt: d.created_at,
    updatedAt: d.updated_at
  }));
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(userId: string): Promise<void> {
  // First delete profile
  await supabase
    .from('user_profiles')
    .delete()
    .eq('id', userId);

  // Note: Actual Supabase auth user deletion requires admin API
  // In production, call your backend API to delete the auth user
}

/**
 * Check if user has permission
 */
export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete'
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];

  // Check for wildcard permission (admin)
  const wildcardPerm = permissions.find(p => p.resource === '*');
  if (wildcardPerm && wildcardPerm.actions.includes(action)) {
    return true;
  }

  // Check specific resource permission
  const resourcePerm = permissions.find(p => p.resource === resource);
  return resourcePerm ? resourcePerm.actions.includes(action) : false;
}

/**
 * Require permission (throws error if not authorized)
 */
export async function requirePermission(
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete'
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const profile = await getUserProfile(user.id);
  if (!profile) {
    throw new Error('User profile not found');
  }

  if (!profile.isActive) {
    throw new Error('User account is inactive');
  }

  if (!hasPermission(profile.role, resource, action)) {
    throw new Error(`Insufficient permissions: ${resource}:${action}`);
  }
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    admin: 'Administrator',
    manager: 'Manager',
    agent: 'Agent',
    viewer: 'Viewer'
  };
  return names[role];
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    admin: 'Full access to all features and settings',
    manager: 'Manage campaigns, leads, and view analytics',
    agent: 'Create and manage leads and campaigns',
    viewer: 'Read-only access to leads and analytics'
  };
  return descriptions[role];
}

/**
 * Reset password (send email)
 */
export async function resetPassword(email: string): Promise<{ error: any }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/#/reset-password`
  });

  return { error };
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string): Promise<{ error: any }> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  return { error };
}

/**
 * Invite user (admin only)
 */
export async function inviteUser(
  email: string,
  role: UserRole
): Promise<{ error: any }> {
  // In production, this would:
  // 1. Send invitation email
  // 2. Create pending user record
  // 3. Generate invite token
  
  // For now, we'll create a user with a random password
  const tempPassword = Math.random().toString(36).slice(-12);
  
  const { user, error } = await signUp(email, tempPassword, email, role);
  
  if (error) return { error };

  // Send password reset email so user can set their own password
  await resetPassword(email);

  return { error: null };
}

/**
 * Change user role (admin only)
 */
export async function changeUserRole(
  userId: string,
  newRole: UserRole
): Promise<void> {
  await requirePermission('users', 'update');
  await updateUserProfile(userId, { role: newRole });
}

/**
 * Deactivate user (admin only)
 */
export async function deactivateUser(userId: string): Promise<void> {
  await requirePermission('users', 'update');
  await updateUserProfile(userId, { isActive: false });
}

/**
 * Activate user (admin only)
 */
export async function activateUser(userId: string): Promise<void> {
  await requirePermission('users', 'update');
  await updateUserProfile(userId, { isActive: true });
}
