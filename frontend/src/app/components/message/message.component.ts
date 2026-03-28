import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage, RagSource } from '../../models/chat.models';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Transcription badge -->
    <div *ngIf="msg.transcription" class="tx-badge-wrap">
      <span class="tx-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
        {{ msg.transcription }}
      </span>
    </div>

    <div class="msg-row" [class.user]="msg.role === 'user'" [class.ai]="msg.role !== 'user'">
      <!-- AI avatar -->
      <div *ngIf="msg.role !== 'user'" class="avatar ai-av">
        <svg viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93V18c0-.55-.45-1-1-1s-1 .45-1 1v1.93C7.06 19.44 4.56 16.94 4.07 13H6c.55 0 1-.45 1-1s-.45-1-1-1H4.07C4.56 7.06 7.06 4.56 11 4.07V6c0 .55.45 1 1 1s1-.45 1-1V4.07C16.94 4.56 19.44 7.06 19.93 11H18c-.55 0-1 .45-1 1s.45 1 1 1h1.93c-.49 3.94-2.99 6.44-6.93 6.93z"/>
        </svg>
      </div>

      <!-- Bubble -->
      <div class="bubble" [class.user]="msg.role === 'user'" [class.ai]="msg.role === 'ai'" [class.error]="msg.role === 'error'">

        <!-- Text -->
        <div *ngIf="msg.text" [innerHTML]="formattedText"></div>

        <!-- File list (user) -->
        <div *ngIf="msg.files && msg.files.length" class="file-list">
          <span *ngFor="let f of msg.files" class="file-chip">📄 {{ f }}</span>
        </div>

        <!-- Sources -->
        <div *ngIf="msg.sources && msg.sources.length" class="sources">
          <div class="sources-hd">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Sources
          </div>
          <div *ngFor="let s of msg.sources; let i = index" class="source-item">
            <div class="source-head">
              <span class="source-num">[{{ i + 1 }}]</span>
              <span class="source-name">{{ s.fileName || s.source || 'Document' }}</span>
              <span *ngIf="s.pageNumber" class="source-page">p.{{ s.pageNumber }}</span>
            </div>
            <div class="source-excerpt">{{ s.chunk || s.text || '' }}</div>
          </div>
        </div>

        <!-- Audio error -->
        <div *ngIf="msg.audioError" class="audio-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          {{ msg.audioError }}
        </div>

        <!-- Audio player (base64) -->
        <div *ngIf="msg.audio && msg.audio.data" class="audio-wrap">
          <div class="audio-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            Réponse audio
          </div>
          <div *ngIf="msg.audio.text" class="audio-text">{{ msg.audio.text }}</div>
          <audio controls [src]="audioSrc"></audio>
        </div>

        <!-- Audio blob (audio-only mode) -->
        <div *ngIf="msg.audioBlobUrl" class="audio-wrap">
          <div class="audio-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            Réponse audio
          </div>
          <audio controls [src]="msg.audioBlobUrl"></audio>
        </div>

      </div>

      <!-- User avatar -->
      <div *ngIf="msg.role === 'user'" class="avatar user-av">W</div>
    </div>
  `,
  styleUrl: './message.component.scss'
})
export class MessageComponent implements OnInit {
  @Input() msg!: ChatMessage;

  formattedText = '';
  audioSrc = '';

  ngOnInit() {
    if (this.msg.text) this.formattedText = this.formatAnswer(this.msg.text);
    if (this.msg.audio?.data) {
      this.audioSrc = `data:${this.msg.audio.mimeType || 'audio/wav'};base64,${this.msg.audio.data}`;
    }
  }

  private formatAnswer(text: string): string {
    let h = this.escHtml(text);
    h = h.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
    h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    h = h.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
    h = h.replace(/^# (.+)$/gm,   '<h1>$1</h1>');
    h = h.replace(/\n/g, '<br>');
    return h;
  }

  private escHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
