import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt?: string;
  lastMessageAt?: string;
}

export interface AssistantMessage {
  id?: string;
  role: 'user' | 'bot';
  content: string;
  conversationId?: string;
  createdAt?: string;
}

export interface ChatResponse {
  response: string;
  messageId?: string;
  error?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly api = 'http://localhost:8080/api/assistant';

  constructor(private readonly http: HttpClient) {}

  // ── Conversations ──────────────────────────────────────────────────────────

  getConversations(userId: string): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.api}/${userId}/conversations`);
  }

  createConversation(userId: string, title?: string): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.api}/${userId}/conversations`,
      title ? { title } : {});
  }

  renameConversation(userId: string, conversationId: string, title: string): Observable<Conversation> {
    return this.http.put<Conversation>(
      `${this.api}/${userId}/conversations/${conversationId}`, { title });
  }

  deleteConversation(userId: string, conversationId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${userId}/conversations/${conversationId}`);
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  getConversationMessages(userId: string, conversationId: string): Observable<AssistantMessage[]> {
    return this.http.get<AssistantMessage[]>(
      `${this.api}/${userId}/conversations/${conversationId}/messages`);
  }

  sendMessage(userId: string, conversationId: string, message: string, email: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(
      `${this.api}/${userId}/conversations/${conversationId}/chat`, { message, email });
  }

  clearConversationHistory(userId: string, conversationId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.api}/${userId}/conversations/${conversationId}/history`);
  }
}
