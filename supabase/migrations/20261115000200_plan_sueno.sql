-- Plan del día de sueño: ánimo al despertar y cómo terminó el sueño; horario fijo opcional por hogar.

create or replace function public.payload_valido(p_tipo public.tipo_evento, p_payload jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select extensions.jsonb_matches_schema(
    case p_tipo
      when 'sueno' then '{"type":"object","additionalProperties":false,"properties":{
        "lugar":{"enum":["cuna","brazos","carriola","auto","otro"]},
        "como_se_durmio":{"enum":["solo","arrullo","pecho","biberon"]},
        "calidad":{"enum":["buena","regular","mala"]},
        "animo_despertar":{"enum":["mal","neutral","bien"]},
        "fin_sueno":{"enum":["natural","despertado"]}}}'
      when 'toma_pecho' then '{"type":"object","additionalProperties":false,"required":["lado_inicial"],"properties":{
        "lado_inicial":{"enum":["izq","der"]},
        "segundos_izq":{"type":"integer","minimum":0,"maximum":21600},
        "segundos_der":{"type":"integer","minimum":0,"maximum":21600},
        "lado_activo":{"enum":["izq","der",null]},
        "ultimo_lado":{"enum":["izq","der",null]},
        "activo_desde":{"type":["string","null"],"maxLength":40}}}'
      when 'toma_biberon' then '{"type":"object","additionalProperties":false,"required":["contenido","volumen_ml"],"properties":{
        "contenido":{"enum":["materna","formula","mixta"]},
        "volumen_ml":{"type":"number","minimum":0,"maximum":1000},
        "sobrante_ml":{"type":"number","minimum":0,"maximum":1000}}}'
      when 'toma_solidos' then '{"type":"object","additionalProperties":false,"required":["alimentos"],"properties":{
        "alimentos":{"type":"array","minItems":1,"maxItems":20,"items":{"type":"string","minLength":1,"maxLength":80}},
        "cantidad":{"type":"string","maxLength":120},
        "reaccion":{"type":"string","maxLength":280}}}'
      when 'extraccion' then '{"type":"object","additionalProperties":false,"properties":{
        "volumen_ml_izq":{"type":"number","minimum":0,"maximum":1000},
        "volumen_ml_der":{"type":"number","minimum":0,"maximum":1000}}}'
      when 'panal' then '{"type":"object","additionalProperties":false,"required":["mojado","sucio"],"properties":{
        "mojado":{"type":"boolean"},"sucio":{"type":"boolean"},
        "color":{"enum":["amarillo","verde","cafe","negro","rojo","blanco","otro",null]},
        "consistencia":{"enum":["liquida","pastosa","firme",null]}}}'
      when 'medicamento' then '{"type":"object","additionalProperties":false,"required":["medication_id","cantidad_textual"],"properties":{
        "medication_id":{"type":"string","format":"uuid"},
        "cantidad_textual":{"type":"string","minLength":1,"maxLength":120},
        "via":{"enum":["oral","topica","inhalada","nasal","otra"]}}}'
      when 'temperatura' then '{"type":"object","additionalProperties":false,"required":["valor_c"],"properties":{
        "valor_c":{"type":"number","minimum":30,"maximum":45},
        "metodo":{"enum":["axilar","rectal","frente","oido"]}}}'
      when 'sintoma' then '{"type":"object","additionalProperties":false,"required":["descripcion"],"properties":{
        "descripcion":{"type":"string","minLength":1,"maxLength":500},
        "severidad":{"enum":["leve","moderado","fuerte",null]}}}'
      when 'nota' then '{"type":"object","additionalProperties":false,"required":["texto"],"properties":{
        "texto":{"type":"string","minLength":1,"maxLength":2000}}}'
    end::json,
    p_payload
  );
$$;

alter table public.household_settings
  add column plan_modo text not null default 'auto' check (plan_modo in ('auto', 'fijo')),
  add column plan_fijo jsonb check (plan_fijo is null or extensions.jsonb_matches_schema('{
    "type":"object","additionalProperties":false,"required":["despertar","siestas","dormir"],
    "properties":{
      "despertar":{"type":"string","pattern":"^([01][0-9]|2[0-3]):[0-5][0-9]$"},
      "dormir":{"type":"string","pattern":"^([01][0-9]|2[0-3]):[0-5][0-9]$"},
      "siestas":{"type":"array","maxItems":4,"items":{"type":"object","additionalProperties":false,"required":["inicio","duracion_min"],
        "properties":{"inicio":{"type":"string","pattern":"^([01][0-9]|2[0-3]):[0-5][0-9]$"},"duracion_min":{"type":"integer","minimum":10,"maximum":240}}}}}}'::json, plan_fijo));
