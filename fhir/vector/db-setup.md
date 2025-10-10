## Setup Steps
### Create a Dedicated Vector Tablespace
```sql
create tablespace fhir_vec_ts
  datafile 'fhir_vec_ts01.dbf' size 2g autoextend on next 1g maxsize unlimited
  extent management local segment space management auto;
```

### Create Vector Schema
```sql
-- Create the sidecar schema/user
create user fhir_vec identified by "fhir_vec"
  default tablespace fhir_vec_ts
  temporary tablespace temp
  quota unlimited on fhir_vec_ts;

grant create session to fhir_vec;
grant create table, create view, create sequence, create procedure to fhir_vec;

grant ctxapp to fhir_vec;
-- these need to run in sqlplus
grant execute on ctxsys.ctx_ddl to fhir_vec;
grant execute on ctxsys.ctx_doc     to fhir_vec;
grant execute on ctxsys.ctx_output  to fhir_vec;
```

### Create Sidecar Tables
#### Create Active (Hot) Observation Vector Table - unpartitioned + ANN index
```sql
create table fhir_vec.obs_vec_active (
  observation_id     varchar2(64) primary key,
  patient_id         varchar2(64) not null,
  effective_start    timestamp with time zone not null,
  effective_end      timestamp with time zone not null,
  code_text          varchar2(256),
  value_text         varchar2(128),
  display_text       clob         not null,  
  embedding          vector(1536) not null, 
  model_name         varchar2(64),
  model_version      varchar2(32),
  text_sha256        varchar2(64),
  created_at         timestamp default systimestamp
);

create index fhir_vec.idx_obs_act_patient   on fhir_vec.obs_vec_active (patient_id);
create index fhir_vec.idx_obs_act_effective on fhir_vec.obs_vec_active (effective_instant);
-- add unique index on the pk and hash to prevent duplicates
create unique index uq_obs_vec_active_sha256
    on fhir_vec.obs_vec_active (observation_id, text_sha256);

-- oracle text preferences (basic)
-- n.b.  you must connect as fhir_vec to execute this block
begin
  ctxsys.ctx_ddl.create_preference('OTX_LEXER', 'BASIC_LEXER');
  ctxsys.ctx_ddl.create_stoplist('OTX_STOPLIST', 'BASIC_STOPLIST');
end;
/

-- oracle text index (lexical search on display_text)
create index fhir_vec.obs_act_ctx
  on fhir_vec.obs_vec_active(display_text)
  indextype is ctxsys.context
  parameters('LEXER OTX_LEXER STOPLIST OTX_STOPLIST SYNC (ON COMMIT)');

-- vector ann index (semantic). tune lists later.
create vector index fhir_vec.obs_act_ivf
on fhir_vec.obs_vec_active (embedding)
organization neighbor partitions
distance cosine
parameters (type ivf, neighbor partitions 512);
```

#### Create History (Cold) Observation Vector Table - partitioned, no ANN index (exact scoring + pruning)
```sql
create table fhir_vec.obs_vec_hist (
  observation_id     varchar2(64) primary key,
  patient_id         varchar2(64) not null,
  effective_start    timestamp with time zone not null,
  effective_end      timestamp with time zone not null,
  effective_utc TIMESTAMP
      GENERATED ALWAYS AS (SYS_EXTRACT_UTC(effective_start)) VIRTUAL,
  code_text          varchar2(256),
  value_text         varchar2(128),
  display_text       clob         not null,
  embedding          vector(1536) not null,
  model_name         varchar2(64),
  model_version      varchar2(32),
  text_sha256        varchar2(64),
  created_at         timestamp default systimestamp
)
partition by range (effective_utc)
interval (numtoyminterval(1,'month')) (
  partition p0 values less than (date '2025-01-01')
);

create index fhir_vec.idx_obs_hist_patient on fhir_vec.obs_vec_hist (patient_id) local;
create index fhir_vec.idx_obs_hist_effective on fhir_vec.obs_vec_hist (effective_start) local;

create index fhir_vec.obs_hist_ctx
  on fhir_vec.obs_vec_hist(display_text)
  indextype is ctxsys.context
  parameters('LEXER OTX_LEXER STOPLIST OTX_STOPLIST SYNC (MANUAL)');
```

### Define a Pl/SQL Procedure to Write Active Observation Vector Embeddings
```sql
create or replace procedure fhir_vec.obs_vec_merge (
  p_observation_id    in  varchar2,
  p_patient_id        in  varchar2,
  p_effective_start   in  timestamp with time zone,
  p_effective_end     in  timestamp with time zone,
  p_code_text         in  varchar2,
  p_value_text        in  varchar2,
  p_display_text      in  clob,
  p_embedding         in  vector, 
  p_model_name        in  varchar2,
  p_model_version     in  varchar2,
  p_text_sha256       in  varchar2
) as
begin
  merge into fhir_vec.obs_vec_active a
  using (
    select
      p_observation_id    as observation_id,
      p_patient_id        as patient_id,
      p_effective_start   as effective_start,
      p_effective_end     as effective_end,
      p_code_text         as code_text,
      p_value_text        as value_text,
      p_display_text      as display_text,
      p_embedding         as embedding,
      p_model_name        as model_name,
      p_model_version     as model_version,
      p_text_sha256       as text_sha256
    from dual
  ) s
  on (a.observation_id = s.observation_id)
  when matched then update set
      a.patient_id        = s.patient_id,
      a.effective_start   = s.effective_start,
      a.effective_end     = s.effective_end,
      a.code_text         = s.code_text,
      a.value_text        = s.value_text,
      a.display_text      = s.display_text,
      a.embedding         = s.embedding,
      a.model_name        = s.model_name,
      a.model_version     = s.model_version,
      a.text_sha256       = s.text_sha256
    where a.text_sha256 <> s.text_sha256
  when not matched then insert (
      observation_id, patient_id, effective_start, effective_end,
      code_text, value_text, display_text, embedding,
      model_name, model_version, text_sha256
  ) values (
      s.observation_id, s.patient_id, s.effective_start, s.effective_end,
      s.code_text, s.value_text, s.display_text, s.embedding,
      s.model_name, s.model_version, s.text_sha256
  );
end;
```
