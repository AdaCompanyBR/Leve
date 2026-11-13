// Telas do contexto ambiental: cartão "Hoje em sua região" (aba Hoje), detalhes do dia (UV, ar,
// melhores horários, próximos dias), escolha da localização, orientação de hidratação (aba
// Líquidos) e o aviso que aparece quando um alerta do dia chega.
import { h, icon, toast, openSheet, busy, searchField } from './dom.js';
import { state } from '../store.js';
import { fmtDate } from '../lib/dates.js';
import { env, onEnv, refresh, location, placeName, useGps, searchPlaces, setManualLocation, clearLocation, GPS_ERRORS, geo, isDevice, deviceGranted } from '../env.js';
import { classify, summary, hydrationTip, bestHours, uvLevel, aqiLevel, uvPeak, rangeText, uvAdvice, dayOutlook, weatherLabel, weatherIcon, isStale } from '../lib/environment.js';

const deg = v => (v == null ? '–' : `${Math.round(v)}°`);
const clock = ms => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const pill = (tone, text) => h('span.env-pill', { 'data-tone': tone }, text);
const SOURCE = 'Previsão Open-Meteo';

/** Mantém um bloco atualizado enquanto ele estiver na tela. */
function live(el, paint) {
  paint();
  const off = onEnv(() => { if (!el.isConnected) return off(); paint(); });
  return el;
}

function updatedText() {
  if (!env.fetchedAt) return null;
  const stale = isStale(env.fetchedAt);
  return `${SOURCE} · atualizada às ${clock(env.fetchedAt)}${stale ? ' · desatualizada' : ''}`;
}

// ---------------------------------------------------------------------------
// Cartão da aba Hoje

export function conditionsCard() {
  const card = h('section.card.env-card', { 'aria-label': 'Condições de hoje' });
  return live(card, () => {
    const loc = location(), ctx = env.ctx;
    if (!loc) {
      const msg = {
        locating: 'Buscando a localização do aparelho…',
        denied: 'O acesso à localização do aparelho foi negado. Para usar a localização, libere o acesso nos ajustes do navegador, ou escolha a cidade.',
        unsupported: 'Este aparelho não informa a localização. Escolha a cidade para ver o clima, o índice UV e a qualidade do ar.',
        error: 'Não deu para descobrir a localização do aparelho agora.',
      }[geo.state] ?? 'Veja temperatura, índice UV e qualidade do ar da sua região, com orientações para hidratação e atividades ao ar livre.';
      card.replaceChildren(
        h('div.card-head', h('h3', 'Condições de hoje')),
        h('p.card-sub', msg),
        geo.state === 'locating' ? null : h('div.env-setup',
          ['denied', 'unsupported'].includes(geo.state) ? null : h('button.btn.tonal', { type: 'button', onclick: e => busy(e.currentTarget, gpsFlow) }, icon('locate'), geo.state === 'error' ? 'Tentar de novo' : 'Usar a localização do aparelho'),
          h('button.btn.plain', { type: 'button', onclick: () => locationSheet() }, 'Escolher cidade')));
      return;
    }
    if (!ctx) {
      card.replaceChildren(h('div.card-head', h('h3', 'Hoje em sua região'), h('span.env-place', placeName())),
        env.loading ? h('p.card-sub', 'Buscando a previsão…')
          : h('div', h('p.card-sub', env.error ?? 'Não foi possível buscar a previsão agora.'), h('button.btn.tonal.compact', { type: 'button', onclick: () => refresh({ force: true }) }, 'Tentar de novo')));
      return;
    }
    const c = ctx.current, d = ctx.todayDay, cls = classify(ctx);
    const uv = uvLevel(c.uv), aq = aqiLevel(ctx.air?.aqi);
    card.replaceChildren(
      h('button.env-open', { type: 'button', 'aria-label': 'Ver detalhes das condições de hoje', onclick: () => envSheet() }),
      h('div.card-head', h('h3', 'Hoje em sua região'), h('span.env-place', placeName(), icon('next'))),
      h('div.env-now',
        h('span.env-icon', icon(weatherIcon(c.code, c.isDay))),
        h('div.env-temp', h('span.env-deg', deg(c.temp)), h('span.env-unit', 'C')),
        h('div.env-desc',
          h('p.env-cond', weatherLabel(c.code) ?? 'Condição indisponível'),
          h('p.env-feels', c.feels != null ? `Sensação de ${deg(c.feels)}` : 'Sensação indisponível'),
          h('p.env-range', d ? `Máx. ${deg(d.max)} · Mín. ${deg(d.min)}` : ''))),
      h('div.env-metrics',
        metric('humidity', 'Umidade', c.humidity != null ? `${Math.round(c.humidity)}%` : 'Indisponível'),
        metric('sun', 'Índice UV', uv ? `${Math.round(c.uv)} · ${uv.label}` : 'Indisponível', uv?.tone),
        metric('leaf', 'Ar', aq ? aq.label : 'Indisponível', aq?.tone)),
      h('div.env-pills', topTwo(cls).map(x => pill(x.tone, x.label))),
      h('p.env-summary', summary(ctx, cls)),
      h('p.env-foot', updatedText(), env.error ? ` · ${env.error}` : ''));
  });
}
// No cartão, no máximo dois selos: o desfavorável para atividade ao ar livre (se houver) e o principal.
const topTwo = cls => { const ext = cls.find(x => x.kind === 'externo'); return ext ? [cls[0], ext].filter((x, i, a) => a.indexOf(x) === i) : cls.slice(0, 2); };
const metric = (ic, label, value, tone) => h('div.env-metric', { 'data-tone': tone ?? '' }, icon(ic), h('span.env-metric-label', label), h('b', value));

// ---------------------------------------------------------------------------
// Detalhes do dia

export function envSheet() {
  const body = h('div.env-detail');
  live(body, () => {
    const ctx = env.ctx;
    if (!ctx) { body.replaceChildren(h('p.sheet-text', env.loading ? 'Buscando a previsão…' : (env.error ?? 'Sem previsão agora.'))); return; }
    const c = ctx.current, d = ctx.todayDay, cls = classify(ctx);
    const nextHours = ctx.hours.filter(x => x.time >= ctx.now.slice(0, 13)).slice(0, 12);
    const today = bestHours(ctx), tomorrow = ctx.week[1] ? bestHours(ctx, ctx.week[1].date) : null;
    const uvNow = uvLevel(c.uv), uvMax = uvLevel(d?.uvMax), peaks = uvPeak(ctx);
    const air = ctx.air, aq = aqiLevel(air?.aqi);
    const best = (b, label) => h('div.env-best', h('span', label), h('b', !b ? 'Sem previsão' : b.ranges.length ? b.ranges.map(rangeText).join(' e ') : 'Nenhum horário favorável previsto'));
    body.replaceChildren(
      h('p.env-summary.big', summary(ctx, cls)),
      section('Como está o dia', h('ul.env-cls', cls.map(x => h('li', pill(x.tone, x.label), h('p', x.why), h('p.env-rule', `Regra: ${x.rule}`))))),
      section('Próximas horas', h('div.env-hours', nextHours.map(x => h('div.env-hour',
        h('span.env-hour-h', `${x.hour}h`), icon(weatherIcon(x.code, x.isDay ?? true)), h('b', deg(x.temp)),
        h('span.env-hour-sub', x.rainProb != null && x.rainProb >= 30 ? `${Math.round(x.rainProb)}%` : x.uv != null && x.uv >= 3 ? `UV ${Math.round(x.uv)}` : ' '))))),
      section('Melhores horários para atividade ao ar livre', h('div.env-bests', best(today, 'Hoje'), tomorrow ? best(tomorrow, 'Amanhã') : null),
        h('p.fine', 'Horas de luz sem tempestade, chuva forte ou vento forte, com sensação térmica abaixo de 32 °C (calor intenso), índice UV abaixo de 6 e ar abaixo de "ruim para grupos sensíveis". É uma referência da previsão: ajuste à sua intensidade e duração, e pare se passar mal.')),
      section('Índice UV', h('div.env-kv',
        kv('Agora', uvNow ? `${Math.round(c.uv)} · ${uvNow.label}` : 'Indisponível', uvNow?.tone),
        kv('Máximo de hoje', uvMax ? `${Math.round(d.uvMax)} · ${uvMax.label}` : 'Indisponível', uvMax?.tone),
        kv('Proteção recomendada', peaks.length ? peaks.map(rangeText).join(' e ') : 'Não prevista para hoje')),
        d?.uvMax != null ? h('ul.env-tips', uvAdvice(d.uvMax).map(t => h('li', t))) : null,
        h('p.fine', 'Categorias da OMS. O índice UV mede a radiação do sol e não depende da temperatura: um dia fresco pode ter UV alto.')),
      section('Qualidade do ar', air ? h('div.env-kv',
        kv('Índice (AQI)', aq ? `${Math.round(air.aqi)} · ${aq.label}` : 'Indisponível', aq?.tone),
        kv('PM2,5', air.pm25 != null ? `${Math.round(air.pm25)} µg/m³` : 'Indisponível'),
        kv('PM10', air.pm10 != null ? `${Math.round(air.pm10)} µg/m³` : 'Indisponível'),
        kv('Ozônio (O₃)', air.o3 != null ? `${Math.round(air.o3)} µg/m³` : 'Indisponível'),
        kv('Dióxido de nitrogênio (NO₂)', air.no2 != null ? `${Math.round(air.no2)} µg/m³` : 'Indisponível'))
        : h('p.sheet-text', env.airError ?? 'Indisponível para esta localização agora.'),
        aq && air.aqi >= 101 ? h('p.env-note', { 'data-tone': aq.tone }, 'A qualidade do ar está desfavorável. Considere reduzir atividades físicas intensas ao ar livre.') : null,
        h('p.fine', `Faixas do AQI da EPA. Estimativa do modelo CAMS (Copernicus), com resolução de cerca de 45 km fora da Europa: pode não refletir a sua rua nem medições de estações locais.${env.airAt ? ` Atualizada às ${clock(env.airAt)}.` : ''} Não é diagnóstico.`)),
      section('Próximos dias', h('ul.env-week', ctx.week.map((x, i) => {
        const o = dayOutlook(x);
        return h('li', h('span.env-week-day', i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : fmtDate(x.date, { weekday: 'short' }).replace('.', '')),
          icon(weatherIcon(x.code)), h('span.env-week-t', `${deg(x.max)} / ${deg(x.min)}`),
          h('span.env-week-uv', x.uvMax != null ? `UV ${Math.round(x.uvMax)}` : ''), pill(o.tone, o.label));
      })), h('p.fine', 'Previsão: pode mudar, e a confiança cai a cada dia mais distante.')),
      section('Localização', h('div.env-kv', kv('Região', placeName()), kv('Fuso', ctx.tz ?? '–')),
        h('div.sheet-actions', h('button.btn.secondary', { type: 'button', onclick: () => locationSheet() }, 'Alterar localização'), h('button.btn.secondary', { type: 'button', onclick: e => busy(e.currentTarget, () => refresh({ force: true })) }, 'Atualizar'))),
      h('p.fine.env-source', 'Dados: ', h('a', { href: 'https://open-meteo.com/', target: '_blank', rel: 'noopener' }, 'Open-Meteo.com'), ' (licença CC BY 4.0), com modelos meteorológicos nacionais e o CAMS para a qualidade do ar. ',
        updatedText() ? `${updatedText()}. ` : '', 'Para alertas oficiais, consulte a Defesa Civil e o ', h('a', { href: 'https://alertas2.inmet.gov.br/', target: '_blank', rel: 'noopener' }, 'INMET'),
        '. As orientações do Leve são educativas e não substituem orientação médica. A ausência de alerta não significa ausência de risco.'));
  });
  return openSheet({ title: 'Condições de hoje', wide: true, content: body });
}
const section = (title, ...kids) => h('section.env-section', h('h3', title), ...kids);
const kv = (k, v, tone) => h('div.env-kv-row', { 'data-tone': tone ?? '' }, h('span', k), h('b', v));

// ---------------------------------------------------------------------------
// Localização

async function gpsFlow() {
  try { await useGps(); toast('Localização atualizada'); }
  catch (err) { toast(GPS_ERRORS[err?.code] ?? GPS_ERRORS[2]); }
}

export function locationSheet() {
  const loc = location();
  const results = h('div.place-results', { role: 'listbox', 'aria-label': 'Cidades encontradas' });
  let seq = 0, timer = null;
  const run = async q => {
    const my = ++seq;
    if (q.trim().length < 2) { results.replaceChildren(); return; }
    results.replaceChildren(h('p.fine', 'Buscando…'));
    try {
      const list = await searchPlaces(q);
      if (my !== seq) return;
      results.replaceChildren(...(list.length ? list.map(p => h('button.place-item', { type: 'button', role: 'option', onclick: async () => {
        await setManualLocation(p); sheet.close(); toast(`Localização: ${p.name}`);
      } }, icon('pin'), h('span.place-main', h('b', p.name), h('span', [p.admin1, p.country].filter(Boolean).join(', '))))) : [h('p.fine', 'Nenhuma cidade com esse nome.')]));
    } catch { if (my === seq) results.replaceChildren(h('p.fine', 'A busca não respondeu agora. Tente de novo.')); }
  };
  const search = searchField({ placeholder: 'Buscar cidade', label: 'Buscar cidade', onInput: q => { clearTimeout(timer); timer = setTimeout(() => run(q), 350); }, onSubmit: q => run(q) });
  const sheet = openSheet({ title: 'Localização', content: [
    h('p.sheet-text', 'O Leve usa a sua região para mostrar o clima, o índice UV e a qualidade do ar do dia e para orientar a hidratação e as atividades ao ar livre.'),
    loc ? h('div.env-kv.place-now', kv('Agora', isDevice(loc) ? 'Localização do aparelho' : `${placeName()} (escolhida pelo nome)`)) : null,
    isDevice(loc) && deviceGranted() ? null : h('button.btn.tonal.block', { type: 'button', onclick: e => busy(e.currentTarget, async () => { await gpsFlow(); if (isDevice(location())) sheet.close(); }) }, icon('locate'), 'Usar a localização do aparelho'),
    isDevice(loc) && deviceGranted() ? h('p.fine', 'O Leve usa a localização do aparelho e a atualiza sozinho ao abrir o app, sem perguntar de novo.')
      : [h('p.place-or', 'Sem acesso à localização do aparelho? Escolha a cidade'), search.el, results],
    h('p.fine', 'Guardamos só as coordenadas aproximadas (cerca de 1 km), ou a cidade escolhida, nunca o endereço. O pedido de acesso aparece uma única vez neste aparelho. No iPhone, se o Safari voltar a perguntar, vá em Ajustes > Apps > Safari > Localização e escolha Permitir; com o Leve na Tela de Início, a permissão fica com o app. Para revogar, remova a localização aqui e o acesso nos ajustes do aparelho.'),
    loc ? h('button.btn.plain.danger.block', { type: 'button', onclick: async () => { await clearLocation(); sheet.close(); toast('Localização removida'); } }, 'Remover localização') : null,
  ] });
  if (!(isDevice(loc) && deviceGranted())) setTimeout(() => search.input.focus({ preventScroll: true }), 350);
  return sheet;
}

// ---------------------------------------------------------------------------
// Aba Líquidos: orientação do dia (a meta não muda)

export function hydrationNote() {
  const el = h('div.env-hydra');
  return live(el, () => {
    const tip = env.ctx ? hydrationTip(env.ctx, { restricted: !!state.settings.fluidRestriction }) : null;
    if (!tip) { el.replaceChildren(); el.hidden = true; return; }
    el.hidden = false;
    el.dataset.tone = tip.tone;
    el.replaceChildren(icon('thermo'), h('p', tip.text, ' ', h('button.link.inline', { type: 'button', onclick: () => envSheet() }, 'Ver o dia')));
  });
}

// ---------------------------------------------------------------------------
// Aviso de alerta (no topo, some sozinho)

export function showAlert(a) {
  document.querySelector('.env-banner')?.remove();
  const icons = { calor: 'thermo', uv: 'sun', ar: 'leaf', tempo: 'storm' };
  const close = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); };
  const el = h('div.env-banner', { role: 'status', 'data-tone': a.tone },
    h('span.env-banner-icon', icon(icons[a.category] ?? 'alert')),
    h('div.env-banner-text', h('b', a.title), h('p', a.text)),
    h('button.icon-btn.small', { type: 'button', 'aria-label': 'Fechar aviso', onclick: close }, icon('close')));
  el.addEventListener('click', e => { if (!e.target.closest('.icon-btn')) { close(); envSheet(); } });
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(close, 9000);
}
