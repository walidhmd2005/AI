import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly apiUrl = '/api/chat';

  constructor(private http: HttpClient) {}

  sendMessage(
    question: string,
    files: File[],
    audio: Blob | null,
    sessionId: string | null,
    responseMode: string
  ): Observable<any> {
    const form = new FormData();
    if (sessionId) form.append('sessionId', sessionId);
    form.append('responseMode', responseMode);
    if (question.trim()) form.append('question', question);
    if (audio) form.append('audio', audio, 'recording.webm');
    files.forEach(f => form.append('files', f, f.name));

    return this.http.post(this.apiUrl, form, { observe: 'response', responseType: 'blob' });
  }
}
