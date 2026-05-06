import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  ViewChild, ElementRef, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../../services/auth';
import {
  AssistantService,
  AssistantMessage,
} from '../../../services/assistant';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './assistant.html',
  styleUrls: ['./assistant.css'],
})
export class AssistantComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('messagesEnd') private messagesEnd!: ElementRef;

  currentUser: any = null;
  sidebarCollapsed = false;
  activeNav = 'ia';
  userMenuOpen = false;

  messages: AssistantMessage[] = [];
  userInput = '';
  isTyping = false;
  historyLoading = true;
  private shouldScrollBottom = false;

  readonly suggestions = [
    'Analysez mon portefeuille actuel',
    'Quelles actions ont un signal d\'achat aujourd\'hui ?',
    'Quels titres sont en zone de survente (RSI < 30) ?',
    'Quelle est la performance du marché ce mois ?',
    'Quels sont les titres les plus volatils ?',
  ];

  private readonly navRoutes: Record<string, string> = {
    dashboard:  '/dashboard',
    ia:         '/assistant',
    portfolio:  '/portfolio',
    reco:       '/assistant',
    profil:     '/profile',
    settings:   '/settings',
  };

  constructor(
    private readonly auth: Auth,
    private readonly assistantService: AssistantService,
    private readonly router: Router,
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (!(e.target as HTMLElement).closest('.user-menu-wrapper')) {
      this.userMenuOpen = false;
    }
  }

  ngOnInit(): void {
    this.currentUser = this.auth.getCurrentUser();
    if (!this.currentUser) { this.router.navigate(['/login']); return; }
    this.loadHistory();
  }

  ngOnDestroy(): void {}

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom) {
      this.scrollToBottom();
      this.shouldScrollBottom = false;
    }
  }

  // ── History ────────────────────────────────────────────────────────────────

  private loadHistory(): void {
    this.historyLoading = true;
    this.assistantService.getHistory(this.currentUser.id).subscribe({
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

  // ── Messaging ──────────────────────────────────────────────────────────────

  useSuggestion(text: string): void {
    this.userInput = text;
    this.send();
  }

  send(): void {
    const text = this.userInput.trim();
    if (!text || this.isTyping) return;
    this.userInput = '';

    this.messages.push({ role: 'user', content: text, createdAt: new Date().toISOString() });
    this.isTyping = true;
    this.shouldScrollBottom = true;

    this.assistantService.sendMessage(this.currentUser.id, text).subscribe({
      next: (res) => {
        this.messages.push({
          role: 'bot',
          content: res.response,
          createdAt: new Date().toISOString(),
        });
        this.isTyping = false;
        this.shouldScrollBottom = true;
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  clearHistory(): void {
    if (!confirm('Effacer tout l\'historique de conversation ?')) return;
    this.assistantService.clearHistory(this.currentUser.id).subscribe({
      next: () => {
        this.messages = [];
        this.pushWelcome();
      },
    });
  }

  // ── Formatting ─────────────────────────────────────────────────────────────

  formatTime(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  formatContent(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  getInitialsUser(): string {
    const f = this.currentUser?.firstName?.[0] || '';
    const l = this.currentUser?.lastName?.[0]  || '';
    return (f + l).toUpperCase() || 'U';
  }

  private scrollToBottom(): void {
    try {
      this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    } catch {}
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  navigateTo(nav: string): void {
    this.activeNav = nav;
    const route = this.navRoutes[nav];
    if (route) this.router.navigate([route]);
  }

  toggleSidebar(): void { this.sidebarCollapsed = !this.sidebarCollapsed; }
  toggleUserMenu(e: MouseEvent): void { e.stopPropagation(); this.userMenuOpen = !this.userMenuOpen; }
  logout(): void { this.auth.logout(); this.router.navigate(['/login']); }
}
