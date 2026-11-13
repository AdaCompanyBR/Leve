// Conta e sincronização (Supabase). Preencha com os dados do seu projeto:
// Supabase > botão "Conectar" (Project URL) e Configurações > Chaves de API > chave publicável (sb_publishable_...).
// NUNCA coloque aqui a chave secreta (sb_secret_...): ela ignora as regras de acesso.
// A chave anon é pública por natureza: quem protege os dados são as regras (RLS) do supabase/schema.sql.
// Vazio = o app funciona só neste aparelho, sem login.
export const SUPABASE_URL = 'https://vsbjlovtoppdagmahtem.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_eQge7F1YKRRX3I50CSiZzg_VILNLOyT';

// Clima e qualidade do ar (Open-Meteo). A versão gratuita é só para uso não comercial e não usa
// chave. Para uso comercial, troque estes endereços pelos de um servidor intermediário que guarde
// a chave (por exemplo, uma função do Supabase); a chave nunca deve ficar aqui no app.
export const WEATHER = {
  forecast: 'https://api.open-meteo.com/v1/forecast',
  air: 'https://air-quality-api.open-meteo.com/v1/air-quality',
  geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
};
