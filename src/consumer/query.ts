import { VectorDbHandler } from '@handler/vectordb';
import { LoggerFactory } from '@consumer/log';
import { createEmbedding } from '@handler/vector/embed';
import oracledb from 'oracledb';

const log = LoggerFactory.create();

const vectordb = new VectorDbHandler(log);

const embedText = 'housing insecurity';

const embedding = await createEmbedding(embedText);

const sql = `
select id, observation_id, patient_id, effective_start, code_text,
  substr(display_text, 1, 160) as snippet,
  vector_distance(embedding, :p_embedding) as vdist
from fhir_vec.obs_vec_active
where patient_id = 11331
order by vdist asc
fetch first 10 rows only`;

await vectordb.select(sql, {
  p_embedding: {
    type: oracledb.DB_TYPE_VECTOR,
    val: embedding,
  },
}).then(_ => {
  vectordb.close();
});
