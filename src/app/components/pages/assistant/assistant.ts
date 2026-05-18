import {
  Component, OnInit, AfterViewChecked,
  ViewChild, ElementRef, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../../services/auth';
import {
  AssistantService,
  AssistantMessage,
  Conversation,
} from '../../../services/assistant';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './assistant.html',
  styleUrls: ['./assistant.css'],
})
export class AssistantComponent implements OnInit, AfterViewChecked {

  @ViewChild('messagesEnd') private readonly messagesEnd!: ElementRef;

  currentUser: any = null;
  sidebarCollapsed = false;
  activeNav = 'ia';
  userMenuOpen = false;

  // ── Conversations state ────────────────────────────────────────────────────
  conversations: Conversation[] = [];
  activeConversation: Conversation | null = null;
  convPanelCollapsed = false;
  conversationsLoading = false;

  // Rename inline state
  renamingId: string | null = null;
  renameValue = '';

  // ── Messages state ─────────────────────────────────────────────────────────
  messages: AssistantMessage[] = [];
  userInput = '';
  isTyping = false;
  historyLoading = false;
  private shouldScrollBottom = false;

  readonly suggestions = [
    'Analysez mon portefeuille actuel',
    'Quelles actions ont un signal d\'achat aujourd\'hui ?',
    'Quels titres sont en zone de survente (RSI < 30) ?',
    'Quelle est la performance du marché ce mois ?',
    'Quels sont les titres les plus volatils ?',
  ];

  private readonly navRoutes: Record<string, string> = {
    dashboard: '/dashboard',
    ia:        '/assistant',
    portfolio: '/portfolio',
    reco:      '/recommendations',
    profil:    '/profile',
    settings:  '/settings',
  };

  constructor(
    private readonly auth: Auth,
    private readonly assistantService: AssistantService,
    private readonly router: Router,
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.user-menu-wrapper')) this.userMenuOpen = false;
    if (!t.closest('.conv-item') && !t.closest('.rename-input')) {
      this.cancelRename();
    }
  }

  ngOnInit(): void {
    this.currentUser = this.auth.getCurrentUser();
    if (!this.currentUser) { this.router.navigate(['/login']); return; }
    this.loadConversations();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom) {
      this.scrollToBottom();
      this.shouldScrollBottom = false;
    }
  }

  // ── Conversations ──────────────────────────────────────────────────────────

  loadConversations(): void {
    this.conversationsLoading = true;
    this.assistantService.getConversations(this.currentUser.id).subscribe({
      next: (convos) => {
        this.conversations = convos;
        this.conversationsLoading = false;
        if (convos.length > 0) {
          this.selectConversation(convos[0]);
        } else {
          this.createNewConversation();
        }
      },
      error: () => {
        this.conversationsLoading = false;
        this.createNewConversation();
      },
    });
  }

  selectConversation(conv: Conversation): void {
    if (this.activeConversation?.id === conv.id) return;
    this.activeConversation = conv;
    this.messages = [];
    this.loadMessages(conv);
  }

  createNewConversation(): void {
    this.assistantService.createConversation(this.currentUser.id).subscribe({
      next: (conv) => {
        this.conversations.unshift(conv);
        this.activeConversation = conv;
        this.messages = [];
        this.pushWelcome();
      },
      error: () => {
        // Offline fallback — create a local-only placeholder
        const placeholder: Conversation = {
          id: 'local-' + Date.now(),
          userId: this.currentUser.id,
          title: 'Nouvelle conversation',
        };
        this.conversations.unshift(placeholder);
        this.activeConversation = placeholder;
        this.messages = [];
        this.pushWelcome();
      },
    });
  }

  startRename(conv: Conversation, e: MouseEvent): void {
    e.stopPropagation();
    this.renamingId  = conv.id;
    this.renameValue = conv.title;
  }

  confirmRename(conv: Conversation): void {
    const trimmed = this.renameValue.trim();
    if (!trimmed || trimmed === conv.title) { this.cancelRename(); return; }
    this.assistantService.renameConversation(this.currentUser.id, conv.id, trimmed).subscribe({
      next: (updated) => {
        const idx = this.conversations.findIndex(c => c.id === conv.id);
        if (idx !== -1) this.conversations[idx] = updated;
        if (this.activeConversation?.id === conv.id) this.activeConversation = updated;
        this.cancelRename();
      },
      error: () => this.cancelRename(),
    });
  }

  cancelRename(): void {
    this.renamingId  = null;
    this.renameValue = '';
  }

  confirmRenameOnEnter(e: KeyboardEvent, conv: Conversation): void {
    if (e.key === 'Enter') { e.preventDefault(); this.confirmRename(conv); }
    if (e.key === 'Escape') { e.preventDefault(); this.cancelRename(); }
  }

  deleteConversation(conv: Conversation, e: MouseEvent): void {
    e.stopPropagation();
    if (!confirm(`Supprimer la conversation "${conv.title}" ?`)) return;
    this.assistantService.deleteConversation(this.currentUser.id, conv.id).subscribe({
      next: () => {
        this.conversations = this.conversations.filter(c => c.id !== conv.id);
        if (this.activeConversation?.id === conv.id) {
          if (this.conversations.length > 0) {
            this.selectConversation(this.conversations[0]);
          } else {
            this.createNewConversation();
          }
        }
      },
    });
  }

  toggleConvPanel(): void { this.convPanelCollapsed = !this.convPanelCollapsed; }

  // ── Messages ───────────────────────────────────────────────────────────────

  private loadMessages(conv: Conversation): void {
    this.historyLoading = true;
    this.assistantService.getConversationMessages(this.currentUser.id, conv.id).subscribe({
      next: (msgs) => {
        this.messages = msgs;
        this.historyLoading = false;
        if (!msgs.length) this.pushWelcome();
        this.shouldScrollBottom = true;
      },
      error: () => {
        this.historyLoading = false;
        this.pushWelcome();
      },
    });
  }

  private pushWelcome(): void {
    this.messages.push({
      role: 'bot',
      content: 'Bonjour ! Je suis **InvestAI Sophia**, votre assistante financière. '
        + 'Je peux analyser les données de marché en temps réel, consulter votre portefeuille '
        + 'et vous fournir des recommandations basées sur nos indicateurs techniques. '
        + 'Comment puis-je vous aider ?',
      createdAt: new Date().toISOString(),
    });
    this.shouldScrollBottom = true;
  }

  useSuggestion(text: string): void {
    this.userInput = text;
    this.send();
  }

  send(): void {
    const text = this.userInput.trim();
    if (!text || this.isTyping || !this.activeConversation) return;
    this.userInput = '';

    this.messages.push({ role: 'user', content: text, createdAt: new Date().toISOString() });
    this.isTyping = true;
    this.shouldScrollBottom = true;

    const convId = this.activeConversation.id;

    this.assistantService
      .sendMessage(this.currentUser.id, convId, text, this.currentUser.email)
      .subscribe({
        next: (res) => {
          this.messages.push({ role: 'bot', content: res.response, createdAt: new Date().toISOString() });
          this.isTyping = false;
          this.shouldScrollBottom = true;

          // Update conversation's lastMessageAt and auto-title locally
          const idx = this.conversations.findIndex(c => c.id === convId);
          if (idx !== -1) {
            if (this.conversations[idx].title === 'Nouvelle conversation') {
              this.conversations[idx].title = text.length > 50 ? text.slice(0, 50) + '…' : text;
            }
            this.conversations[idx].lastMessageAt = new Date().toISOString();
            // Re-sort: move to top
            const updated = this.conversations.splice(idx, 1)[0];
            this.conversations.unshift(updated);
            if (this.activeConversation?.id === convId) this.activeConversation = updated;
          }
        },
        error: () => {
          this.messages.push({
            role: 'bot',
            content: 'Une erreur est survenue. Vérifiez que le service n8n est démarré.',
            createdAt: new Date().toISOString(),
          });
          this.isTyping = false;
          this.shouldScrollBottom = true;
        },
      });
  }

  onEnter(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }

  clearHistory(): void {
    if (!this.activeConversation) return;
    if (!confirm('Effacer les messages de cette conversation ?')) return;
    this.assistantService
      .clearConversationHistory(this.currentUser.id, this.activeConversation.id)
      .subscribe({
        next: () => { this.messages = []; this.pushWelcome(); },
      });
  }

  // ── Formatting ─────────────────────────────────────────────────────────────

  formatTime(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Aujourd\'hui';
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  formatContent(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,     '<em>$1</em>')
      .replace(/\n/g,            '<br>');
  }

  getInitialsUser(): string {
    const f = this.currentUser?.firstName?.[0] || '';
    const l = this.currentUser?.lastName?.[0]  || '';
    return (f + l).toUpperCase() || 'U';
  }

  private scrollToBottom(): void {
    try { this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  navigateTo(nav: string): void {
    this.activeNav = nav;
    const route = this.navRoutes[nav];
    if (route) this.router.navigate([route]);
  }

  switchToAdminMode(): void { this.router.navigate(['/admin']); }
  toggleSidebar(): void     { this.sidebarCollapsed = !this.sidebarCollapsed; }
  toggleUserMenu(e: MouseEvent): void { e.stopPropagation(); this.userMenuOpen = !this.userMenuOpen; }
  logout(): void { this.auth.logout(); this.router.navigate(['/login']); }
}
