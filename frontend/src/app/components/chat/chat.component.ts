import {
  Component, ElementRef, OnDestroy, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpResponse } from '@angular/common/http';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { MessageComponent } from '../message/message.component';
import { InputBarComponent, SendPayload } from '../input-bar/input-bar.component';
import { ChatService } from '../../services/chat.service';
import { ChatMessage, RagAnswer } from '../../models/chat.models';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, SidebarComponent, MessageComponent, InputBarComponent],
  template: `
    <!-- Ambient background -->
    <div class="bg-ambient"></div>
    <div class="bg-grid"></div>

    <div class="layout">
      <!-- Sidebar -->
      <app-sidebar
        [isRecording]="isRecording"
        (attachFile)="filePassthrough()"
        (toggleMic)="toggleRecording()"
        (clearChat)="clearChat()"
      ></app-sidebar>

      <!-- Main -->
      <div class="main">

        <!-- Topbar -->
        <div class="topbar">
          <div class="topbar-left">
            <span class="topbar-title">Nouvelle conversation</span>
            <span class="topbar-badge">RAG · STT · TTS</span>
          </div>
        </div>

        <!-- Messages -->
        <div class="chat-scroll" #chatScroll>
          <div class="chat-inner">

            <!-- Empty state -->
            <div *ngIf="!messages.length" class="empty-state">
              <div class="empty-hero">
                <div class="empty-hero-ring"></div>
                <div class="empty-hero-inner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
              </div>
              <h2>Comment puis-je vous aider ?</h2>
              <p>Posez une question, partagez un PDF ou envoyez un message vocal.</p>
              <div class="suggestions">
                <button class="chip" *ngFor="let s of suggestions" (click)="useSuggestion(s.text)">{{ s.label }}</button>
              </div>
            </div>

            <!-- Message list -->
            <div *ngFor="let msg of messages" class="msg-group">
              <app-message [msg]="msg"></app-message>
            </div>

            <!-- Typing indicator -->
            <div *ngIf="isLoading" class="typing-row">
              <div class="avatar ai-av">
                <svg viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93V18c0-.55-.45-1-1-1s-1 .45-1 1v1.93C7.06 19.44 4.56 16.94 4.07 13H6c.55 0 1-.45 1-1s-.45-1-1-1H4.07C4.56 7.06 7.06 4.56 11 4.07V6c0 .55.45 1 1 1s1-.45 1-1V4.07C16.94 4.56 19.44 7.06 19.93 11H18c-.55 0-1 .45-1 1s.45 1 1 1h1.93c-.49 3.94-2.99 6.44-6.93 6.93z"/>
                </svg>
              </div>
              <div class="typing-bubble">
                <span></span><span></span><span></span>
              </div>
            </div>

          </div>
        </div>

        <!-- Input area -->
        <div class="input-area">
          <app-input-bar
            #inputBar
            [isRecording]="isRecording"
            [isSending]="isLoading"
            [recordedBlob]="recordedBlob"
            (send)="onSend($event)"
            (toggleMic)="toggleRecording()"
            (clearChat)="clearChat()"
            (badFiles)="showToast($event, 'error')"
          ></app-input-bar>
        </div>

      </div>
    </div>

    <!-- Drag overlay -->
    <div class="drag-overlay" [class.active]="isDragging">
      <div class="drag-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span>Déposez vos fichiers PDF ici</span>
      </div>
    </div>

    <!-- Toast -->
    <div class="toast-wrap">
      <div class="toast" [class.show]="toastVisible" [class.success]="toastType === 'success'" [class.error]="toastType === 'error'">
        {{ toastMsg }}
      </div>
    </div>
  `,
  styleUrl: './chat.component.scss',
  host: {
    '(dragenter)': 'onDragEnter($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(dragover)':  'onDragOver($event)',
    '(drop)':      'onDrop($event)',
  }
})
export class ChatComponent implements OnDestroy {
  @ViewChild('chatScroll') chatScrollRef!: ElementRef<HTMLDivElement>;
  @ViewChild('inputBar')   inputBarRef!: InputBarComponent;

  messages: ChatMessage[] = [];
  sessionId: string | null = null;
  isLoading   = false;
  isRecording = false;
  isDragging  = false;
  recordedBlob: Blob | null = null;

  toastMsg     = '';
  toastType: 'success' | 'error' = 'error';
  toastVisible = false;
  private toastTimer: any;

  private mediaRecorder?: MediaRecorder;
  private audioChunks:    Blob[] = [];
  private dragCounter = 0;

  suggestions = [
    { label: 'Étudiants ILCS',    text: 'Qui sont les étudiants en ILCS ?' },
    { label: 'Notes disponibles', text: 'Quelles sont les notes disponibles ?' },
    { label: 'Résume le document', text: 'Résume le document uploadé' },
    { label: 'Tes capacités',     text: 'Bonjour, que peux-tu faire ?' },
  ];

  constructor(private chatSvc: ChatService) {}

  useSuggestion(text: string) {
    if (this.inputBarRef) {
      this.inputBarRef.text = text;
      this.inputBarRef.autoResize();
    }
  }

  filePassthrough() { this.inputBarRef?.fileInputRef?.nativeElement.click(); }

  async toggleRecording() {
    if (this.isRecording) {
      this.mediaRecorder?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks   = [];
      this.mediaRecorder.ondataavailable = e => this.audioChunks.push(e.data);
      this.mediaRecorder.onstop = () => {
        this.recordedBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        this.isRecording = false;
        this.showToast('Audio enregistré — cliquez Envoyer pour transcrire.', 'success');
      };
      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (e: any) {
      this.showToast('Microphone inaccessible : ' + e.message, 'error');
    }
  }

  async onSend(payload: SendPayload) {
    if (this.isLoading) return;

    const { text, files, audio, mode } = payload;
    if (!text && !files.length && !audio) return;

    if (text || files.length) {
      this.addMessage({
        id: this.uid(),
        role: 'user',
        text: text || undefined,
        files: files.map(f => f.name)
      });
    }

    this.recordedBlob = null;
    this.isLoading    = true;
    this.scrollBottom();

    this.chatSvc.sendMessage(text, files, audio, this.sessionId, mode).subscribe({
      next: (res: HttpResponse<Blob>) => {
        this.isLoading = false;
        const ct = res.headers.get('content-type') || '';

        if (ct.startsWith('audio/')) {
          const url = URL.createObjectURL(res.body!);
          this.sessionId = res.headers.get('X-Session-Id') || this.sessionId;
          this.addMessage({ id: this.uid(), role: 'ai', audioBlobUrl: url });
        } else {
          const reader = new FileReader();
          reader.onload = () => {
            const data: RagAnswer = JSON.parse(reader.result as string);
            this.sessionId = data.sessionId || res.headers.get('X-Session-Id') || this.sessionId;
            this.addMessage({
              id: this.uid(),
              role: 'ai',
              text:          data.answer,
              transcription: data.transcription,
              sources:       data.sources,
              audio:         data.audio,
              audioError:    data.audioError,
            });
          };
          reader.readAsText(res.body!);
        }
        this.scrollBottom();
      },
      error: (err) => {
        this.isLoading = false;
        const msg = this.parseError(err);
        this.addMessage({ id: this.uid(), role: 'error', text: msg });
        this.showToast(msg, 'error');
        this.scrollBottom();
      }
    });
  }

  clearChat() {
    this.messages   = [];
    this.sessionId  = null;
    this.recordedBlob = null;
  }

  showToast(msg: string, type: 'success' | 'error') {
    clearTimeout(this.toastTimer);
    this.toastMsg     = msg;
    this.toastType    = type;
    this.toastVisible = true;
    this.toastTimer   = setTimeout(() => this.toastVisible = false, 3800);
  }

  /* Drag & drop */
  onDragEnter(e: DragEvent) { e.preventDefault(); this.dragCounter++; this.isDragging = true; }
  onDragLeave(_: DragEvent) { if (--this.dragCounter <= 0) { this.dragCounter = 0; this.isDragging = false; } }
  onDragOver(e: DragEvent)  { e.preventDefault(); }
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragCounter = 0;
    this.isDragging  = false;
    const files = e.dataTransfer ? [...e.dataTransfer.files] : [];
    this.inputBarRef?.addFiles(files);
  }

  private addMessage(msg: ChatMessage) { this.messages.push(msg); }

  private scrollBottom() {
    setTimeout(() => {
      if (this.chatScrollRef) this.chatScrollRef.nativeElement.scrollTop = this.chatScrollRef.nativeElement.scrollHeight;
    }, 50);
  }

  private parseError(err: any): string {
    if (err.status === 429) return 'Limite de débit atteinte. Réessayez dans quelques instants.';
    if (err.status === 413) return 'Fichier trop volumineux (max 20 MB).';
    if (err.error instanceof Blob) {
      return `Erreur ${err.status}`;
    }
    return err.error?.message || err.message || `Erreur ${err.status}`;
  }

  private uid(): string { return Math.random().toString(36).slice(2); }

  ngOnDestroy() { clearTimeout(this.toastTimer); }
}
