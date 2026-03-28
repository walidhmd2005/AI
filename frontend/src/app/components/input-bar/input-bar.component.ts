import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SendPayload {
  text: string;
  files: File[];
  audio: Blob | null;
  mode: string;
}

@Component({
  selector: 'app-input-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="input-shell">
      <!-- File preview -->
      <div *ngIf="pendingFiles.length" class="files-preview">
        <div *ngFor="let f of pendingFiles; let i = index" class="file-tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          {{ f.name }}
          <button class="file-rm" (click)="removeFile(i)">×</button>
        </div>
      </div>

      <!-- Input card -->
      <div class="input-card">
        <div class="input-row">
          <textarea
            #textarea
            [(ngModel)]="text"
            (input)="autoResize()"
            (keydown)="onKeydown($event)"
            placeholder="Posez votre question…"
            rows="1"
          ></textarea>
          <button class="iBtn" [class.recording]="isRecording" (click)="toggleMic.emit()" title="Message vocal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8"  y1="23" x2="16" y2="23"/>
            </svg>
          </button>
          <button class="send-btn" [disabled]="!canSend" (click)="doSend()" title="Envoyer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <div class="input-toolbar">
          <button class="tbar-btn" (click)="fileInput.click()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
            Joindre PDF
          </button>
          <button class="tbar-btn" (click)="clearChat.emit()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            Effacer
          </button>

          <div class="mode-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            <select [(ngModel)]="mode">
              <option value="text">Texte</option>
              <option value="both">Texte + Audio</option>
              <option value="audio">Audio seul</option>
            </select>
          </div>

          <span class="tbar-hint">Shift+Entrée pour saut de ligne</span>
        </div>
      </div>
    </div>

    <input #fileInput type="file" accept=".pdf,text/plain" multiple style="display:none"
      (change)="onFileChange($event)" />
  `,
  styleUrl: './input-bar.component.scss'
})
export class InputBarComponent {
  @Input()  isRecording = false;
  @Input()  isSending   = false;
  @Input()  recordedBlob: Blob | null = null;
  @Output() send        = new EventEmitter<SendPayload>();
  @Output() toggleMic   = new EventEmitter<void>();
  @Output() clearChat   = new EventEmitter<void>();
  @Output() badFiles    = new EventEmitter<string>();

  @ViewChild('textarea') textareaRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  text = '';
  mode = 'text';
  pendingFiles: File[] = [];

  get canSend(): boolean {
    return !this.isSending && (!!this.text.trim() || this.pendingFiles.length > 0 || !!this.recordedBlob);
  }

  autoResize() {
    const el = this.textareaRef.nativeElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.doSend(); }
  }

  doSend() {
    if (!this.canSend) return;
    this.send.emit({
      text: this.text.trim(),
      files: [...this.pendingFiles],
      audio: this.recordedBlob,
      mode: this.mode
    });
    this.text = '';
    this.pendingFiles = [];
    setTimeout(() => this.autoResize(), 0);
  }

  onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) this.addFiles([...input.files]);
    input.value = '';
  }

  addFiles(list: File[]) {
    const valid = list.filter(f => f.type === 'application/pdf' || f.type === 'text/plain' || f.name.endsWith('.txt'));
    if (valid.length !== list.length) this.badFiles.emit('Seuls les fichiers PDF et .txt sont acceptés.');
    valid.forEach(f => {
      if (!this.pendingFiles.find(x => x.name === f.name && x.size === f.size)) this.pendingFiles.push(f);
    });
  }

  removeFile(idx: number) { this.pendingFiles.splice(idx, 1); }
}
