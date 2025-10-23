// API client for My Mail
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface User {
  id: number;
  email: string;
  fullName: string | null;
}

export interface Email {
  id: number;
  folder_id: number;
  message_id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string;
  body_plaintext: string;
  body_html: string;
  is_read: number;
  is_starred: number;
  has_attachments: number;
  received_at: number;
  attachment_count?: number;
}

export interface Folder {
  id: number;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  email_count: number;
  unread_count: number;
}

export interface Contact {
  id: number;
  email: string;
  full_name: string | null;
  company: string | null;
  is_favorite: number;
  contact_count: number;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async register(email: string, password: string, fullName?: string) {
    return this.request<{ success: boolean; userId: number; message: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName }),
      }
    );
  }

  async login(email: string, password: string) {
    const response = await this.request<{ success: boolean; token: string; user: User }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    this.setToken(response.token);
    return response;
  }

  async verifyEmail(token: string) {
    return this.request<{ success: boolean; message: string }>(
      '/auth/verify-email',
      {
        method: 'POST',
        body: JSON.stringify({ token }),
      }
    );
  }

  async forgotPassword(email: string) {
    return this.request<{ success: boolean; message: string }>(
      '/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
  }

  async resetPassword(token: string, password: string) {
    return this.request<{ success: boolean; message: string }>(
      '/auth/reset-password',
      {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      }
    );
  }

  // Email endpoints
  async getEmails(folderId?: number, page: number = 1, limit: number = 50) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (folderId) {
      params.append('folder_id', folderId.toString());
    }
    return this.request<{
      emails: Email[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/emails?${params}`);
  }

  async getEmail(id: number) {
    return this.request<Email & { attachments: any[] }>(`/emails/${id}`);
  }

  async sendEmail(data: {
    to: Array<{ email: string; name?: string }>;
    subject: string;
    html?: string;
    text?: string;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
  }) {
    return this.request<{ success: boolean; message_id: string; email_id: number }>(
      '/emails/send',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async searchEmails(query: string, limit: number = 50) {
    return this.request<{ emails: Email[] }>(
      `/emails/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
  }

  async markEmailAsRead(id: number, isRead: boolean) {
    return this.request<{ success: boolean }>(`/emails/${id}/read`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead }),
    });
  }

  async moveEmail(id: number, folderId: number) {
    return this.request<{ success: boolean }>(`/emails/${id}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ folderId }),
    });
  }

  async starEmail(id: number, isStarred: boolean) {
    return this.request<{ success: boolean }>(`/emails/${id}/star`, {
      method: 'PATCH',
      body: JSON.stringify({ isStarred }),
    });
  }

  async deleteEmail(id: number, permanent: boolean = false) {
    return this.request<{ success: boolean }>(
      `/emails/${id}${permanent ? '?permanent=true' : ''}`,
      {
        method: 'DELETE',
      }
    );
  }

  // Folder endpoints
  async getFolders() {
    return this.request<{ folders: Folder[] }>('/folders');
  }

  async createFolder(name: string, parentFolderId?: number, color?: string, icon?: string) {
    return this.request<{ success: boolean; folder_id: number }>('/folders', {
      method: 'POST',
      body: JSON.stringify({ name, parentFolderId, color, icon }),
    });
  }

  async updateFolder(id: number, data: { name?: string; color?: string; icon?: string }) {
    return this.request<{ success: boolean }>(`/folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteFolder(id: number) {
    return this.request<{ success: boolean }>(`/folders/${id}`, {
      method: 'DELETE',
    });
  }

  // Contact endpoints
  async getContacts(search?: string, favorite?: boolean) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (favorite) params.append('favorite', 'true');
    return this.request<{ contacts: Contact[] }>(`/contacts?${params}`);
  }

  async getContact(id: number) {
    return this.request<Contact>(`/contacts/${id}`);
  }

  async createContact(data: {
    email: string;
    fullName?: string;
    company?: string;
    phone?: string;
  }) {
    return this.request<{ success: boolean; contact_id: number }>('/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateContact(id: number, data: Partial<Contact>) {
    return this.request<{ success: boolean }>(`/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteContact(id: number) {
    return this.request<{ success: boolean }>(`/contacts/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();

