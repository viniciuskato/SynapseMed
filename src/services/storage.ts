import {
  Discipline,
  Theme,
  Compendium,
  Question,
  ClinicalCase,
  Flashcard,
  QuestionAnswerRecord,
  SimuladoSessionData,
  UserPlan,
  UserStats,
  ErrorLogItem,
  ThemeMode,
} from '../types';
import {
  INITIAL_DISCIPLINES,
  INITIAL_THEMES,
  INITIAL_COMPENDIUMS,
  INITIAL_QUESTIONS,
  INITIAL_CLINICAL_CASES,
  INITIAL_FLASHCARDS,
} from '../data/mockData';
import { calculateNextSRS, createInitialSRS } from './srsAlgorithm';

const STORAGE_KEYS = {
  DISCIPLINES: 'synapse_disciplines_v1',
  THEMES: 'synapse_themes_v1',
  COMPENDIUMS: 'synapse_compendiums_v1',
  QUESTIONS: 'synapse_questions_v1',
  CLINICAL_CASES: 'synapse_clinical_cases_v1',
  FLASHCARDS: 'synapse_flashcards_v1',
  ANSWERS: 'synapse_answers_v1',
  READING_PROGRESS: 'synapse_reading_progress_v1',
  BOOKMARKS: 'synapse_bookmarks_v1',
  NOTES: 'synapse_notes_v1',
  SIMULADOS: 'synapse_simulados_v1',
  USER_PLAN: 'synapse_user_plan_v1',
  ERROR_LOG: 'synapse_error_log_v1',
  HIGHLIGHTS: 'synapse_compendium_highlights_v1',
  THEME: 'synapse_theme_v1',
};

// Safe LocalStorage helpers
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage`, e);
  }
}

export const StorageService = {
  // --- Content Loaders ---
  getDisciplines(): Discipline[] {
    return getItem<Discipline[]>(STORAGE_KEYS.DISCIPLINES, INITIAL_DISCIPLINES);
  },
  saveDisciplines(disciplines: Discipline[]): void {
    setItem(STORAGE_KEYS.DISCIPLINES, disciplines);
  },

  getThemes(): Theme[] {
    return getItem<Theme[]>(STORAGE_KEYS.THEMES, INITIAL_THEMES);
  },
  saveThemes(themes: Theme[]): void {
    setItem(STORAGE_KEYS.THEMES, themes);
  },

  getCompendiums(): Compendium[] {
    return getItem<Compendium[]>(STORAGE_KEYS.COMPENDIUMS, INITIAL_COMPENDIUMS);
  },
  saveCompendiums(compendiums: Compendium[]): void {
    setItem(STORAGE_KEYS.COMPENDIUMS, compendiums);
  },
  saveCompendium(compendium: Compendium): void {
    const all = this.getCompendiums();
    const idx = all.findIndex((c) => c.id === compendium.id);
    if (idx >= 0) {
      all[idx] = compendium;
    } else {
      all.unshift(compendium);
    }
    this.saveCompendiums(all);
  },
  deleteCompendium(id: string): void {
    const all = this.getCompendiums().filter((c) => c.id !== id);
    this.saveCompendiums(all);
  },

  getQuestions(): Question[] {
    return getItem<Question[]>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS);
  },
  saveQuestions(questions: Question[]): void {
    setItem(STORAGE_KEYS.QUESTIONS, questions);
  },
  saveQuestion(question: Question): void {
    const all = this.getQuestions();
    const idx = all.findIndex((q) => q.id === question.id);
    if (idx >= 0) {
      all[idx] = question;
    } else {
      all.unshift(question);
    }
    this.saveQuestions(all);
  },
  deleteQuestion(id: string): void {
    const all = this.getQuestions().filter((q) => q.id !== id);
    this.saveQuestions(all);
  },

  getClinicalCases(): ClinicalCase[] {
    return getItem<ClinicalCase[]>(STORAGE_KEYS.CLINICAL_CASES, INITIAL_CLINICAL_CASES);
  },
  saveClinicalCases(cases: ClinicalCase[]): void {
    setItem(STORAGE_KEYS.CLINICAL_CASES, cases);
  },
  saveClinicalCase(cCase: ClinicalCase): void {
    const all = this.getClinicalCases();
    const idx = all.findIndex((c) => c.id === cCase.id);
    if (idx >= 0) {
      all[idx] = cCase;
    } else {
      all.unshift(cCase);
    }
    this.saveClinicalCases(all);
  },

  getFlashcards(): Flashcard[] {
    const cards = getItem<Flashcard[]>(STORAGE_KEYS.FLASHCARDS, INITIAL_FLASHCARDS);
    return cards.map((c) => ({
      ...c,
      srs: c.srs || createInitialSRS(),
    }));
  },
  saveFlashcards(flashcards: Flashcard[]): void {
    setItem(STORAGE_KEYS.FLASHCARDS, flashcards);
  },
  saveFlashcard(flashcard: Flashcard): Flashcard {
    const all = this.getFlashcards();
    const idx = all.findIndex((f) => f.id === flashcard.id);
    if (idx >= 0) {
      all[idx] = flashcard;
    } else {
      all.unshift(flashcard);
    }
    this.saveFlashcards(all);
    return flashcard;
  },
  deleteFlashcard(id: string): void {
    const all = this.getFlashcards().filter((f) => f.id !== id);
    this.saveFlashcards(all);
  },
  getDueFlashcards(): Flashcard[] {
    const now = new Date();
    return this.getFlashcards().filter((c) => {
      if (!c.srs || !c.srs.nextDueDate) return true;
      const dueDate = new Date(c.srs.nextDueDate);
      return isNaN(dueDate.getTime()) || dueDate <= now || c.srs.state === 'new';
    });
  },
  updateFlashcardSRS(cardId: string, srs: any): void {
    const all = this.getFlashcards();
    const idx = all.findIndex((f) => f.id === cardId);
    if (idx >= 0) {
      all[idx] = { ...all[idx], srs };
      this.saveFlashcards(all);
    }
  },


  // Create flashcard directly from a question with 1 click!
  createFlashcardFromQuestion(question: Question): Flashcard {
    const template = question.flashcardTemplate || {
      front: `[${question.institution} ${question.year}] ${question.questionStem.slice(0, 180)}...`,
      back: `Resposta Correta:\n${question.options.find((o) => o.isCorrect)?.text || ''}\n\nExplicação:\n${question.highYieldSummary}`,
      mechanismNote: question.highYieldSummary,
    };

    const newCard: Flashcard = {
      id: `fc-from-q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      disciplineId: question.disciplineId,
      themeId: question.themeId,
      compendiumRefId: question.compendiumRefId,
      questionOriginId: question.id,
      front: template.front,
      back: template.back,
      mechanismHighlight: template.mechanismNote,
      tags: [...question.tags, 'Gerado de Questão'],
      difficulty: question.difficulty,
      isCustom: true,
      srs: createInitialSRS(),
    };

    this.saveFlashcard(newCard);
    return newCard;
  },

  // Review flashcard with SM-2 rating
  reviewFlashcard(cardId: string, rating: 1 | 2 | 3 | 4): Flashcard | null {
    const cards = this.getFlashcards();
    const idx = cards.findIndex((c) => c.id === cardId);
    if (idx < 0) return null;

    const updatedSRS = calculateNextSRS(cards[idx].srs, rating);
    cards[idx] = {
      ...cards[idx],
      srs: updatedSRS,
    };
    this.saveFlashcards(cards);
    return cards[idx];
  },

  // --- Answers & Error Logging ---
  getAnswers(): Record<string, QuestionAnswerRecord> {
    return getItem<Record<string, QuestionAnswerRecord>>(STORAGE_KEYS.ANSWERS, {});
  },
  recordAnswer(record: QuestionAnswerRecord): void {
    const answers = this.getAnswers();
    answers[record.questionId] = record;
    setItem(STORAGE_KEYS.ANSWERS, answers);

    // If answer is incorrect, log to Error Notebook
    if (!record.isCorrect) {
      const errorLogs = this.getErrorLogs();
      const existingIdx = errorLogs.findIndex((e) => e.questionId === record.questionId);
      const questions = this.getQuestions();
      const q = questions.find((item) => item.id === record.questionId);
      const correctOpt = q?.options.find((o) => o.isCorrect)?.letter || 'A';

      const errorItem: ErrorLogItem = {
        id: `err-${Date.now()}`,
        questionId: record.questionId,
        timestamp: record.timestamp,
        selectedOption: record.selectedOption,
        correctOption: correctOpt,
        errorReason: record.errorReason || 'lacuna_teorica',
        userNotes: record.userNotes || '',
        resolved: false,
      };

      if (existingIdx >= 0) {
        errorLogs[existingIdx] = errorItem;
      } else {
        errorLogs.unshift(errorItem);
      }
      setItem(STORAGE_KEYS.ERROR_LOG, errorLogs);
    }
  },

  getErrorLogs(): ErrorLogItem[] {
    return getItem<ErrorLogItem[]>(STORAGE_KEYS.ERROR_LOG, []);
  },
  updateErrorLog(errorItem: ErrorLogItem): void {
    const logs = this.getErrorLogs();
    const idx = logs.findIndex((e) => e.id === errorItem.id || e.questionId === errorItem.questionId);
    if (idx >= 0) {
      logs[idx] = errorItem;
      setItem(STORAGE_KEYS.ERROR_LOG, logs);
    }
  },

  // --- Reading Progress ---
  getReadingProgress(): Record<string, { readSectionIds: string[]; percent: number }> {
    return getItem(STORAGE_KEYS.READING_PROGRESS, {});
  },
  toggleSectionRead(compendiumId: string, sectionId: string, totalSections: number): number {
    const progress = this.getReadingProgress();
    const compProgress = progress[compendiumId] || { readSectionIds: [], percent: 0 };
    const idx = compProgress.readSectionIds.indexOf(sectionId);
    if (idx >= 0) {
      compProgress.readSectionIds.splice(idx, 1);
    } else {
      compProgress.readSectionIds.push(sectionId);
    }
    compProgress.percent = Math.round((compProgress.readSectionIds.length / Math.max(1, totalSections)) * 100);
    progress[compendiumId] = compProgress;
    setItem(STORAGE_KEYS.READING_PROGRESS, progress);
    return compProgress.percent;
  },

  // --- Bookmarks ---
  getBookmarks(): {
    questions: string[];
    compendiums: string[];
    flashcards: string[];
    clinicalCases: string[];
  } {
    return getItem(STORAGE_KEYS.BOOKMARKS, {
      questions: [],
      compendiums: [],
      flashcards: [],
      clinicalCases: [],
    });
  },
  toggleBookmark(type: 'questions' | 'compendiums' | 'flashcards' | 'clinicalCases', id: string): boolean {
    const bookmarks = this.getBookmarks();
    const list = bookmarks[type];
    const idx = list.indexOf(id);
    let isBookmarked = false;
    if (idx >= 0) {
      list.splice(idx, 1);
      isBookmarked = false;
    } else {
      list.push(id);
      isBookmarked = true;
    }
    setItem(STORAGE_KEYS.BOOKMARKS, bookmarks);
    return isBookmarked;
  },

  // --- Notes ---
  getNotes(): Record<string, string> {
    return getItem<Record<string, string>>(STORAGE_KEYS.NOTES, {});
  },
  saveNote(targetId: string, noteText: string): void {
    const notes = this.getNotes();
    notes[targetId] = noteText;
    setItem(STORAGE_KEYS.NOTES, notes);
  },

  // --- Highlights ---
  getHighlights(): Record<string, Array<{ text: string; color: string; timestamp: string }>> {
    return getItem(STORAGE_KEYS.HIGHLIGHTS, {});
  },
  addHighlight(compendiumId: string, text: string, color = 'amber'): void {
    const highlights = this.getHighlights();
    const list = highlights[compendiumId] || [];
    list.push({ text, color, timestamp: new Date().toISOString() });
    highlights[compendiumId] = list;
    setItem(STORAGE_KEYS.HIGHLIGHTS, highlights);
  },

  // --- Simulados Sessions ---
  getSimulados(): SimuladoSessionData[] {
    return getItem<SimuladoSessionData[]>(STORAGE_KEYS.SIMULADOS, []);
  },
  saveSimuladoSession(session: SimuladoSessionData): void {
    const list = this.getSimulados();
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      list[idx] = session;
    } else {
      list.unshift(session);
    }
    setItem(STORAGE_KEYS.SIMULADOS, list);
  },

  // --- User Profile & Plan ---
  getUserProfile(): {
    id: string;
    name: string;
    email: string;
    cycle: 'clinico';
    plan: UserPlan;
    streakDays: number;
    avatarUrl?: string;
  } {
    const plan = this.getUserPlan();
    return {
      id: 'user-med-1',
      name: 'Dr. Lucas Medeiros',
      email: 'lucas.med@synapsemed.com.br',
      cycle: 'clinico',
      plan,
      streakDays: 4,
    };
  },
  updatePlan(plan: UserPlan) {
    this.setUserPlan(plan);
    return this.getUserProfile();
  },
  getUserPlan(): UserPlan {
    return getItem<UserPlan>(STORAGE_KEYS.USER_PLAN, 'premium');
  },
  setUserPlan(plan: UserPlan): void {
    setItem(STORAGE_KEYS.USER_PLAN, plan);
  },

  // --- Theme Mode ---
  getTheme(): ThemeMode {
    const saved = getItem<ThemeMode | null>(STORAGE_KEYS.THEME, null);
    if (saved === 'light' || saved === 'dark') return saved;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  },
  setTheme(theme: ThemeMode): void {
    setItem(STORAGE_KEYS.THEME, theme);
  },

  // --- Aggregated Stats ---
  getStats(): UserStats {
    return this.getUserStats();
  },
  getUserStats(): UserStats {
    const answers = Object.values(this.getAnswers()) as QuestionAnswerRecord[];
    const totalAnswered = answers.length;
    const totalCorrect = answers.filter((a) => a.isCorrect).length;
    const cards = this.getFlashcards();
    const todayStr = new Date().toISOString().slice(0, 10);
    const reviewedToday = cards.reduce((acc, c) => {
      const todayCount = (c.srs?.reviewHistory || []).filter((h) => h?.date?.startsWith(todayStr)).length;
      return acc + (todayCount > 0 ? 1 : 0);
    }, 0);

    const readingProgress = this.getReadingProgress() as Record<string, { readSectionIds: string[]; percent: number }>;
    const compendiumsReadCount = Object.values(readingProgress).filter((p) => p && p.percent >= 80).length;

    return {
      totalAnswered,
      totalCorrect,
      streakDays: totalAnswered > 0 ? 4 : 1,
      lastActiveDate: new Date().toISOString(),
      cardsReviewedToday: reviewedToday,
      compendiumsReadCount,
    };
  },

  // --- Aliases for CMS / Simulados ---
  saveCustomQuestion(question: Question): void {
    this.saveQuestion(question);
  },
  resetToDefaults(): void {
    this.resetAllData();
  },
  getSimuladoHistory(): SimuladoSessionData[] {
    return this.getSimulados();
  },


  // --- Reset to Factory Defaults ---
  resetAllData(): void {
    localStorage.clear();
  },

  // --- Export & Import JSON for CMS / Backup ---
  exportFullData(): string {
    const bundle = {
      disciplines: this.getDisciplines(),
      themes: this.getThemes(),
      compendiums: this.getCompendiums(),
      questions: this.getQuestions(),
      clinicalCases: this.getClinicalCases(),
      flashcards: this.getFlashcards(),
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    return JSON.stringify(bundle, null, 2);
  },

  importFullData(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data.disciplines) setItem(STORAGE_KEYS.DISCIPLINES, data.disciplines);
      if (data.themes) setItem(STORAGE_KEYS.THEMES, data.themes);
      if (data.compendiums) setItem(STORAGE_KEYS.COMPENDIUMS, data.compendiums);
      if (data.questions) setItem(STORAGE_KEYS.QUESTIONS, data.questions);
      if (data.clinicalCases) setItem(STORAGE_KEYS.CLINICAL_CASES, data.clinicalCases);
      if (data.flashcards) setItem(STORAGE_KEYS.FLASHCARDS, data.flashcards);
      return true;
    } catch (e) {
      console.error('Failed to import database JSON', e);
      return false;
    }
  },
};
