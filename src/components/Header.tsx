import React from 'react';
import {
  Search,
  Flame,
  Layers,
  Crown,
  Sparkles,
  Settings,
  BookOpen,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';
import { UserPlan, UserStats, ThemeMode } from '../types';

interface HeaderProps {
  currentPlan: UserPlan;
  onOpenPlanModal: () => void;
  onTogglePlanQuick: () => void;
  onOpenSearch: () => void;
  stats: UserStats;
  dueCardsCount: number;
  activeView: string;
  onSelectView: (view: string) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPlan,
  onOpenPlanModal,
  onTogglePlanQuick,
  onOpenSearch,
  stats,
  dueCardsCount,
  activeView,
  onSelectView,
  theme,
  onToggleTheme,
}) => {
  const accuracyPercent =
    stats.totalAnswered > 0
      ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
      : 0;

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 transition-colors max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => onSelectView('dashboard')}
            className="flex items-center gap-2 sm:gap-2.5 text-left group focus:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-900 dark:bg-[#d4924a] text-white dark:text-[#111010] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform font-serif-reading font-bold text-base">
              Ψ
            </div>
            <div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="font-serif-reading font-bold text-base sm:text-lg tracking-tight text-stone-900 dark:text-[#e2ddd6] group-hover:text-amber-800 dark:group-hover:text-[#d4924a] transition-colors">
                  Base de Estudos
                </span>
                <span className="hidden sm:inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-[#2a1810] text-amber-900 dark:text-[#d4924a] border border-amber-300 dark:border-[#d4924a]/40 font-mono-code">
                  Medicina
                </span>
              </div>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 hidden sm:block font-sans">
                Compêndios de Área & Mecanismos Fisiopatológicos
              </p>
            </div>
          </button>
        </div>

        {/* Center: Global Search Bar Trigger */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-xl text-slate-500 dark:text-slate-400 text-sm transition-all text-left shadow-inner cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm truncate">
                Buscar compêndios, questões, temas, drogas...
              </span>
            </div>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-xs">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right: Metrics, Plan Badges & Theme Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Mobile search button */}
          <button
            onClick={onOpenSearch}
            className="p-1.5 sm:p-2 md:hidden text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            title="Buscar"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Quick Streak & SRS Due Pill */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200">
            <div
              className="flex items-center gap-1 text-amber-600 dark:text-amber-400"
              title="Ofensiva de estudos diários"
            >
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{stats.streakDays}d</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              onClick={() => onSelectView('flashcards')}
              className="flex items-center gap-1 text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
              title="Cards para revisar hoje"
            >
              <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{dueCardsCount} cards</span>
            </button>
            {stats.totalAnswered > 0 && (
              <>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <div
                  className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400"
                  title="Taxa de acertos geral"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{accuracyPercent}%</span>
                </div>
              </>
            )}
          </div>

          {/* Theme Selector (Claro / Escuro) */}
          <button
            onClick={onToggleTheme}
            id="header-theme-toggle"
            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition-all cursor-pointer flex items-center justify-center shadow-xs"
            title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Plan Badge / Switcher */}
          {currentPlan === 'premium' ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenPlanModal}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-semibold text-xs shadow-xs hover:shadow-amber-500/20 hover:brightness-105 transition-all cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 fill-slate-950" />
                <span className="hidden sm:inline">PREMIUM PRO</span>
                <span className="sm:hidden text-[11px] font-bold">PRO</span>
              </button>
              <button
                onClick={onTogglePlanQuick}
                className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline px-1 hidden xl:inline-block cursor-pointer"
                title="Alternar para testar modo gratuito"
              >
                Simular Free
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenPlanModal}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs shadow-xs transition-all animate-pulse cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Assinar Premium</span>
                <span className="sm:hidden text-[11px] font-bold">Upgrade</span>
              </button>
              <button
                onClick={onTogglePlanQuick}
                className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline px-1 hidden xl:inline-block cursor-pointer"
                title="Alternar para testar modo premium"
              >
                Simular Pro
              </button>
            </div>
          )}

          {/* Admin CMS Direct Shortcut */}
          <button
            onClick={() => onSelectView('admin')}
            className={`p-1.5 sm:p-2 rounded-xl border text-xs font-medium transition-colors items-center gap-1 cursor-pointer hidden sm:flex ${
              activeView === 'admin'
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-teal-600 dark:border-teal-500'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title="Painel Administrativo & Editor de Conteúdo Médico"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden lg:inline">Admin CMS</span>
          </button>
        </div>
      </div>
    </header>
  );
};
