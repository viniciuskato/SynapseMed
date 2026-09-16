/**
 * Leitor de conteúdo/feedback de questões — sem browser, sem Playwright,
 * sem servidor Vite rodando. Criado para substituir o hábito de abrir o
 * app num browser (ou usar automação de browser) só para conferir o
 * enunciado, as alternativas e a explicação por alternativa de uma
 * questão: aqui é uma consulta direta ao Supabase via service role,
 * impressa como texto legível no terminal.
 *
 * Usa SUPABASE_SERVICE_ROLE_KEY (bypassa RLS), diferente da RPC
 * get_question_review usada pelo app (que exige auth.uid() com tentativa
 * registrada — ver supabase/migrations/20260906120000_question_review_rpc.sql).
 * Isso é intencional: este script é para revisão de conteúdo por quem
 * mantém o banco, não para simular a experiência do estudante.
 *
 * Este script é SÓ LEITURA (nenhum insert/update/delete) e, por padrão,
 * usa o mesmo VITE_SUPABASE_URL do .env.local do repo — que aponta para o
 * projeto REMOTO. Isso é intencional aqui (o conteúdo real está lá), mas
 * a URL efetiva é sempre impressa no início da execução para nunca rodar
 * "no escuro".
 *
 * Uso:
 *   npx tsx scripts/read-question-feedback.ts                  # lista as 20 questões mais recentes
 *   npx tsx scripts/read-question-feedback.ts <uuid>            # questão específica, por id
 *   npx tsx scripts/read-question-feedback.ts "hipernatremia"   # busca por trecho do enunciado
 *   npx tsx scripts/read-question-feedback.ts "asma" --status=published
 *   npx tsx scripts/read-question-feedback.ts <uuid> --json     # dump bruto (debug)
 *   npx tsx scripts/read-question-feedback.ts --limit=50        # lista mais itens
 */

import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Faltam VITE_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.local. ' +
      'Este script não inventa fallback — configure antes de rodar.'
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseArgs(argv: string[]) {
  const flags: { json: boolean; status?: string; limit: number } = { json: false, limit: 20 };
  const positional: string[] = [];
  for (const arg of argv) {
    if (arg === '--json') flags.json = true;
    else if (arg.startsWith('--status=')) flags.status = arg.slice('--status='.length);
    else if (arg.startsWith('--limit=')) flags.limit = Number(arg.slice('--limit='.length)) || 20;
    else positional.push(arg);
  }
  return { flags, query: positional.join(' ').trim() };
}

type QuestionRow = {
  id: string;
  question_stem: string;
  clinical_vignette: string | null;
  status: string;
  difficulty: string | null;
  discipline_id: string | null;
  theme_id: string | null;
  created_at?: string;
};

async function resolveNames(ids: (string | null)[], table: 'disciplines' | 'themes') {
  const uniqueIds = [...new Set(ids.filter((v): v is string => Boolean(v)))];
  if (uniqueIds.length === 0) return new Map<string, string>();
  const { data, error } = await admin.from(table).select('id, name').in('id', uniqueIds);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.id as string, row.name as string]));
}

async function listRecent(limit: number, status?: string) {
  let q = admin
    .from('questions')
    .select('id, question_stem, clinical_vignette, status, difficulty, discipline_id, theme_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status && status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as QuestionRow[];
}

async function searchByStem(term: string, limit: number, status?: string) {
  let q = admin
    .from('questions')
    .select('id, question_stem, clinical_vignette, status, difficulty, discipline_id, theme_id, created_at')
    .ilike('question_stem', `%${term}%`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status && status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as QuestionRow[];
}

async function fetchById(id: string) {
  const { data, error } = await admin
    .from('questions')
    .select('id, question_stem, clinical_vignette, status, difficulty, discipline_id, theme_id, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as QuestionRow | null;
}

async function fetchFeedback(questionId: string) {
  const [{ data: options, error: optErr }, { data: answerKey, error: ansErr }] = await Promise.all([
    admin
      .from('question_options')
      .select('id, letter, option_text, sort_order, question_option_keys(is_correct, explanation)')
      .eq('question_id', questionId)
      .order('sort_order', { ascending: true }),
    admin
      .from('question_answer_keys')
      .select('general_commentary, high_yield_summary')
      .eq('question_id', questionId)
      .maybeSingle(),
  ]);
  if (optErr) throw optErr;
  if (ansErr) throw ansErr;
  return { options: options ?? [], answerKey: answerKey ?? null };
}

function printQuestionFull(
  q: QuestionRow,
  disciplineName: string | undefined,
  themeName: string | undefined,
  options: any[],
  answerKey: { general_commentary: string | null; high_yield_summary: string | null } | null
) {
  console.log('='.repeat(78));
  console.log(`ID: ${q.id}`);
  console.log(`Status: ${q.status}  |  Dificuldade: ${q.difficulty ?? '—'}`);
  console.log(`Disciplina: ${disciplineName ?? '—'}  |  Tema: ${themeName ?? '—'}`);
  if (q.clinical_vignette) {
    console.log('\nVinheta clínica:');
    console.log(q.clinical_vignette);
  }
  console.log('\nEnunciado:');
  console.log(q.question_stem);
  console.log('\nAlternativas:');
  for (const opt of options) {
    const key = Array.isArray(opt.question_option_keys) ? opt.question_option_keys[0] : opt.question_option_keys;
    const mark = key?.is_correct ? '✔ CORRETA' : '';
    console.log(`\n  ${opt.letter}) ${opt.option_text} ${mark}`);
    if (key?.explanation) {
      console.log(`     Explicação: ${key.explanation}`);
    } else {
      console.log('     Explicação: (vazia)');
    }
  }
  if (answerKey) {
    if (answerKey.general_commentary) {
      console.log('\nComentário geral:');
      console.log(answerKey.general_commentary);
    }
    if (answerKey.high_yield_summary && answerKey.high_yield_summary !== answerKey.general_commentary) {
      console.log('\nResumo de alto rendimento:');
      console.log(answerKey.high_yield_summary);
    }
  } else {
    console.log('\n(Sem question_answer_keys para esta questão.)');
  }
  console.log('='.repeat(78));
}

async function main() {
  const { flags, query } = parseArgs(process.argv.slice(2));

  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(
    SUPABASE_URL!.includes('127.0.0.1') || SUPABASE_URL!.includes('localhost')
      ? '(local)\n'
      : '(REMOTO — lendo o projeto de produção, só leitura)\n'
  );

  let matches: QuestionRow[] = [];

  if (query && UUID_RE.test(query)) {
    const one = await fetchById(query);
    matches = one ? [one] : [];
    if (!one) {
      console.log(`Nenhuma questão encontrada com id=${query}`);
      return;
    }
  } else if (query) {
    matches = await searchByStem(query, flags.limit, flags.status);
    if (matches.length === 0) {
      console.log(`Nenhuma questão encontrada com "${query}" no enunciado (status=${flags.status ?? 'qualquer'}).`);
      return;
    }
  } else {
    matches = await listRecent(flags.limit, flags.status);
  }

  // Sem termo de busca e sem id exato, e mais de uma questão: mostra lista
  // curta para escolher, não o conteúdo completo de todas (evita despejo
  // gigante sem necessidade).
  const showFullContent = matches.length === 1 || (query.length > 0 && UUID_RE.test(query));

  if (!showFullContent) {
    const disciplineNames = await resolveNames(matches.map((m) => m.discipline_id), 'disciplines');
    const themeNames = await resolveNames(matches.map((m) => m.theme_id), 'themes');
    console.log(`${matches.length} questão(ões) — refine a busca ou passe o id exato para ver o conteúdo completo:\n`);
    for (const m of matches) {
      const stem = m.question_stem.length > 90 ? `${m.question_stem.slice(0, 90)}…` : m.question_stem;
      console.log(
        `${m.id}  [${m.status}]  ${disciplineNames.get(m.discipline_id ?? '') ?? '—'} / ${
          themeNames.get(m.theme_id ?? '') ?? '—'
        }\n    ${stem}\n`
      );
    }
    return;
  }

  const disciplineNames = await resolveNames(matches.map((m) => m.discipline_id), 'disciplines');
  const themeNames = await resolveNames(matches.map((m) => m.theme_id), 'themes');

  for (const q of matches) {
    const { options, answerKey } = await fetchFeedback(q.id);
    if (flags.json) {
      console.log(JSON.stringify({ question: q, options, answerKey }, null, 2));
      continue;
    }
    printQuestionFull(q, disciplineNames.get(q.discipline_id ?? ''), themeNames.get(q.theme_id ?? ''), options, answerKey);
  }
}

main().catch((err) => {
  console.error('Erro ao ler feedback de questão(ões):', err);
  process.exit(1);
});
