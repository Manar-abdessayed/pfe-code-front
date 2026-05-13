import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AssistantMessage {
  id?: string;
  role: 'user' | 'bot';
  content: string;
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

  getHistory(userId: string): Observable<AssistantMessage[]> {
    return this.http.get<AssistantMessage[]>(`${this.api}/${userId}/history`);
  }

  sendMessage(userId: string, message: string, email: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.api}/${userId}/chat`, { message, email });
  }

  clearHistory(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${userId}/history`);
  }
}
