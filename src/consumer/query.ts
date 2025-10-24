import { VectorDbHandler } from '@handler/vectordb';
import { LoggerFactory } from '@consumer/log';
import { createEmbedding } from '@handler/vector/embed';
import oracledb from 'oracledb';

const log = LoggerFactory.create();

const vectordb = new VectorDbHandler(log);

const embedText = 'housing insecurity';

const embedding = await createEmbedding(embedText);

// @ts-ignore
const knnSql = `
select id, observation_id, patient_id, effective_start, code_text,
  substr(display_text, 1, 160) as snippet,
  vector_distance(embedding, :p_embedding) as vdist
from fhir_vec.obs_vec_active
where patient_id = 11331
order by vdist asc
fetch first 10 rows only`;

const hybridSql = `
with c as (
  select
    id, observation_id, patient_id, effective_start, display_text, embedding,
    score(1) as bm25
  from fhir_vec.obs_vec_active
  where patient_id = 11331
    and contains(display_text, 'housing', 1) > 0
)
select
  id, observation_id, patient_id, effective_start,
  substr(display_text, 1, 200) as snippet,
  bm25,
  vector_distance(embedding, :p_embedding) as vdist,
  (bm25 * 1.0) + ( 10.0 / (1e-6 + vector_distance(embedding, :p_embedding)) ) as hybrid_score
from c
order by hybrid_score desc
fetch first 10 rows only`;

await vectordb.select(hybridSql, {
  p_embedding: {
    type: oracledb.DB_TYPE_VECTOR,
    val: embedding,
  },
}).then(_ => {
  vectordb.close();
});
