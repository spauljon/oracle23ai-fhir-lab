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
#### Create Observation Vector Table
```sql
create table fhir_vec.obs_vec_active (
  observation_id     varchar2(64) primary key,
  patient_id         varchar2(64) not null,
  effective_instant  timestamp    not null,
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
