# Knowledge Graph Configuration

# Knowledge Graph Configuration

## Table of Contents
- [Oracle Property Graph Schema Strategies](#oracle-property-graph-schema-strategies)
  - [Comparison with Purpose-Built Graph Databases](#comparison-with-purpose-built-graph-databases)
  - [Oracle Graph Database Object Strategies](#oracle-graph-database-object-strategies)
    - [Strategy 1: One Set of Objects For All Resource Types](#strategy-1-one-set-of-objects-for-all-resource-types)
    - [Strategy 2: Dedicated Vertex and Edge Objects for Heavy-Use Resource Types, Another Set of Objects For Other Types](#strategy-2-dedicated-vertex-and-edge-objects-for-heavy-use-resource-types-another-set-of-objects-for-other-types)
    - [Strategy 3 (Chosen): Dedicated Vertex and Edge Objects for All Resource Types](#strategy-3-chosen-dedicated-vertex-and-edge-objects-for-all-resource-types)
  - [Oracle Query Language Support](#oracle-query-language-support)
- [FHIR Schema Definition](#fhir-schema-definition)
  - [Create a Dedicated Graph Tablespace](#create-a-dedicated-graph-tablespace)
  - [Create Graph Schema](#create-graph-schema)
  - [Create Graph Vertex Schema Objects for FHIR Resource Types](#create-graph-vertex-schema-objects-for-fhir-resource-types)
    - [KG Patient](#kg-patient)
    - [KG Encounter](#kg-encounter)
    - [KG Observation](#kg-observation)
    - [KG Condition](#kg-condition)
    - [KG Procedure](#kg-procedure)
    - [KG Medication Request](#kg-medication-request)
    - [KG Medication Admin](#kg-medication-admin)
    - [KG Practitioner](#kg-practitioner)
    - [KG Organization](#kg-organization)
    - [KG Location](#kg-location)
  - [Create Edge Tables to Support Property Graph Syntax Requirements](#create-edge-tables-to-support-property-graph-syntax-requirements)
  - [Define the Property Graph](#define-the-property-graph)


## Oracle Property Graph Schema Strategies
### Comparison with Purpose-Built Graph Databases
Oracle’s Property Graph (and other “RDBMS-hosted” graph engines, like SQL Server Graph, PostgreSQL PGX/AGE, etc.) are graph layers on top of explicit relational storage, while Neo4j (and other native graph databases) are graph-first engines whose underlying persistence model is hidden.

Here’s a clear comparison:

| Aspect | Oracle Property Graph | Neo4j (Native Graph) |
|--------|----------------------|----------------------|
| Storage model | Vertices and edges are rows in ordinary tables (or views) inside the RDBMS. You can see, query, index, partition, and tune them. | Nodes and relationships are stored in proprietary, pointer-based files optimized for graph traversal; not exposed as tables. |
| Schema visibility | Fully visible and user-controlled — you design vertex/edge tables, partitions, indexes, tablespaces, etc. | Hidden. You only see graph entities and their properties through Cypher; the physical layout is opaque. |
| Integration with SQL / enterprise data | Direct: graphs can join to relational, vector, and text indexes in one database, one transaction, one optimizer. | Requires external ETL or connectors to integrate with other datastores. |
| Performance model | Traversals compiled to SQL and executed by the RDBMS optimizer; performance depends on indexes, partitioning, and query plan quality. | Pointer-based adjacency lists; constant-time hops; optimized for deep traversals and graph algorithms. |
| Schema evolution | Normal relational DDL—add columns, partitions, indexes anytime. | Dynamic at runtime; add labels and properties freely, but physical tuning is internal. |
| Graph algorithms | Run via PGX in-database or in-memory, fed from your property graph. | Native algorithms library operates directly on the graph store. |
| Operational control | You tune I/O, tablespaces, compression, backups like any Oracle schema. | Neo4j manages its own storage, caching, and clustering. |
| Use-case sweet spot | Mixed workloads where graph queries complement SQL, text, or vector search—typical in enterprise data fabrics. | Pure graph analytics or OLTP graph workloads needing millions of rapid hops (social, fraud, routing). |

### Oracle Graph Database Object Strategies
#### Strategy 1: One Set of Objects For All Resource Types
This strategy proposes one set of Vertex and Edge tables, with resource-specific content buried in JSON CLOBs.  
While this approach smooths the ingestion path, it increases the access path complexity (by requiring realtime JSON 
path parsing in select statements).

#### Strategy 2: Dedicated Vertex and Edge Objects for Heavy-Use Resource Types, Another Set of Objects For Other Types
Graph tables can combine resource-specific and general purpose graph tables and views.  

#### Strategy 3 (Chosen): Dedicated Vertex and Edge Objects for All Resource Types
This strategy uses specific vertex and edge tables (with appropriate columns) for each resource type.  This provides 
maximum performance tuning and access flexibility, and avoids JSON parsing overhead.

### Oracle Query Language Support
✅ What Oracle supports

- PGQL: Oracle’s native query language for property graphs.  ￼
- SQL/PGQ: A subset of the ISO/IEC SQL standard extension for property graphs (supported in recent Oracle releases).  ￼
- Oracle documentation says queries expressed in PGQL can be executed against property-graph objects and translate 
down to SQL under the covers.  ￼

⚠️ Why it’s not full Cypher
- The syntax and semantics of PGQL/SQL-PGQ differ from Cypher. For example, the way MATCH patterns are expressed and 
how variables/labels are defined is different.  ￼
- Cypher allows certain constructs (like explicit RETURN, WITH, variable binding in a particular style) that don’t 
  map 1-to-1 to PGQL or SQL/PGQ in Oracle.  ￼
- Oracle’s benchmarks compare PGQL to Cypher in Neo4j and clearly show PGQL was developed to match the property graph 
  query capability — but not to replicate every Cypher feature.  ￼

> N.B.  We will write property graphs using standard Oracle DML, and read using PGQL.

## FHIR Schema Definition
### Create a Dedicated Graph Tablespace
```sql
create tablespace fhir_graph_ts
  datafile 'fhir_graph_ts01.dbf' size 2g autoextend on next 1g maxsize unlimited
  extent management local segment space management auto;
```

### Create Graph Schema
```sql
create user fhir_graph identified by "fhir_graph"
  default tablespace fhir_graph_ts
  temporary tablespace temp
  quota unlimited on fhir_graph_ts;

grant create session to fhir_graph;
grant create table, create view, create sequence, create procedure to fhir_graph;

grant ctxapp to fhir_graph;

-- these need to run in sqlplus as sysdba
grant execute on ctxsys.ctx_ddl to fhir_graph;
grant execute on ctxsys.ctx_doc     to fhir_graph;
grant execute on ctxsys.ctx_output  to fhir_graph;
```

### Create Graph Vertex Schema Objects for FHIR Resource Types
> N.B.  For each oracle session, default the schema.

```sql
alter session set current_schema = fhir_graph;
```
#### KG Patient
```sql
create table kg_patient (
  patient_id   varchar2(64) primary key,
  birth_date   date,
  gender       varchar2(16),
  first_name   varchar2(25),
  last_name    varchar2(25)
)
partition by hash (patient_id) partitions 16;

create index idx_pat_gender on kg_patient(gender);
create index idx_patient_name on kg_patient(last_name, first_name);
```

#### KG Encounter
```sql
create table kg_encounter (
  encounter_id   varchar2(64) primary key,
  patient_id     varchar2(64) not null,
  period_start   timestamp,
  period_end     timestamp,
  class_code     varchar2(40),
  type_code      varchar2(80),
  condition_code varchar2(40)
)
partition by hash (patient_id) partitions 16;

create index idx_enc_patient_id   on kg_encounter(patient_id) local;
create index idx_enc_class on kg_encounter(class_code) local;
create index idx_enc_cond_code on kg_encounter(condition_code) local;
```

#### KG Observation
```sql
create table kg_observation (
  id              number generated always as identity primary key,
  obs_id          varchar2(64),
  patient_id      varchar2(64) not null,
  encounter_id    varchar2(64),
  effective_start timestamp,
  code            varchar2(80),
  value_num       number,
  unit            varchar2(40)
)
partition by hash (patient_id) partitions 16;

create index idx_obs_id on kg_observation(obs_id) local;
create index idx_obs_patient_id on kg_observation(patient_id) local;
create index idx_obs_code_ts on kg_observation(code, effective_start) local;
create index idx_obs_enc on kg_observation(encounter_id) local;
```

#### KG Condition
```sql
create table kg_condition (
  cond_id       varchar2(64) primary key,
  patient_id    varchar2(64) not null,
  code          varchar2(80),
  clinical_status varchar2(40),
  onset         timestamp,
  abatement     timestamp
)
partition by hash (patient_id) partitions 16;

create index idx_cond_patient_id on kg_condition(patient_id) local;
create index idx_cond_code on kg_condition(code) local;
```

#### KG Procedure
```sql
create table kg_procedure (
  proc_id        varchar2(64) primary key,
  patient_id     varchar2(64) not null,
  encounter_id   varchar2(64),
  code           varchar2(80),
  performed_start timestamp,
  performer_id   varchar2(64)
)
partition by hash (patient_id) partitions 16;

create index idx_proc_patient_id on kg_procedure(patient_id) local;
create index idx_proc_code on kg_procedure(code) local;
```

#### KG Medication Request
```sql
create table kg_med_request (
  mr_id        varchar2(64) primary key,
  patient_id   varchar2(64) not null,
  practitioner_id varchar2(64),
  code         varchar2(80),
  status       varchar2(40),
  authored_on  timestamp
)
partition by hash (patient_id) partitions 16;

create index idx_mr_patient_id on kg_med_request(patient_id) local;
create index idx_mr_code on kg_med_request(code) local;
```

#### KG Medication Admin
```sql
create table kg_med_admin (
  ma_id         varchar2(64) primary key,
  patient_id    varchar2(64) not null,
  practitioner_id varchar2(64),
  code      varchar2(80),
  effective_start timestamp
)
partition by hash (patient_id) partitions 16;

create index idx_ma_pid   on kg_med_admin(patient_id) local;
create index idx_ma_code  on kg_med_admin(code) local;
```

#### KG Practitioner
```sql
create table kg_practitioner (
  practitioner_id varchar2(64) primary key,
  name            varchar2(400)
);
```

#### KG Organization
```sql
create table kg_organization (
  org_id   varchar2(64) primary key,
  name     varchar2(400),
  type     varchar2(80)
);
```

#### KG Location
```sql
create table kg_location (
  location_id varchar2(64) primary key,
  name        varchar2(400),
  type        varchar2(80)
);
```

### Create Edge Tables to Support Property Graph Syntax Requirements
```sql
----------------------------------------------------------------
-- Patient ──has_observation──> Observation
----------------------------------------------------------------
create table e_has_observation (
  patient_id  varchar2(64) not null,
  obs_id      varchar2(64) not null,
  constraint pk_e_has_observation primary key (patient_id, obs_id) 
      using index local
)
partition by hash (patient_id) partitions 16;

create index x_epho_dst on e_has_observation(obs_id)     local;

----------------------------------------------------------------
-- Observation ──recorded_during──> Encounter
----------------------------------------------------------------
create table e_recorded_during (
  obs_id        varchar2(64) not null,
  encounter_id  varchar2(64) not null,
  patient_id    varchar2(64) not null,
  constraint pk_e_recorded_during primary key (obs_id, encounter_id) using index
)
partition by hash (patient_id) partitions 16;

create index x_erd_src on e_recorded_during(obs_id)        local;
create index x_erd_dst on e_recorded_during(encounter_id)  local;
create index x_erd_pat on e_recorded_during(patient_id)    local;

----------------------------------------------------------------
-- Observation ──authored_by──> Practitioner
----------------------------------------------------------------
create table e_authored_by (
  obs_id          varchar2(64) not null,
  practitioner_id varchar2(64) not null,
  patient_id      varchar2(64) not null,
  constraint pk_e_authored_by primary key (obs_id, practitioner_id) using index
)
partition by hash (patient_id) partitions 16;

create index x_eab_src on e_authored_by(obs_id)            local;
create index x_eab_dst on e_authored_by(practitioner_id)   local;
create index x_eab_pat on e_authored_by(patient_id)        local;

----------------------------------------------------------------
-- Patient ──has_condition──> Condition
----------------------------------------------------------------
create table e_has_condition (
  patient_id varchar2(64) not null,
  cond_id    varchar2(64) not null,
  constraint pk_e_has_condition primary key (patient_id, cond_id) using index
)
partition by hash (patient_id) partitions 16;

create index x_ehc_src on e_has_condition(patient_id) local;
create index x_ehc_dst on e_has_condition(cond_id)    local;

----------------------------------------------------------------
-- Patient ──had_procedure──> Procedure
----------------------------------------------------------------
create table e_had_procedure (
  patient_id varchar2(64) not null,
  proc_id    varchar2(64) not null,
  constraint pk_e_had_procedure primary key (patient_id, proc_id) using index
)
partition by hash (patient_id) partitions 16;

create index x_ehp_src on e_had_procedure(patient_id) local;
create index x_ehp_dst on e_had_procedure(proc_id)    local;

```

### Define the Property Graph
```sql
create property graph fhir_pg
  vertex tables (
    kg_patient           key (patient_id)        label patient,
    kg_observation       key (obs_id)            label observation,
    kg_encounter         key (encounter_id)      label encounter,
    kg_condition         key (cond_id)           label condition,
    kg_procedure         key (proc_id)           label procedure,
    kg_med_request       key (mr_id)             label medication_request,
    kg_med_admin         key (ma_id)             label medication_admin,
    kg_practitioner      key (practitioner_id)   label practitioner,
    kg_organization      key (org_id)            label organization,
    kg_location          key (location_id)       label location
  )
  edge tables (
    e_has_observation
      key (patient_id, obs_id)
      source      key (patient_id)  references kg_patient (patient_id)
      destination key (obs_id)      references kg_observation (obs_id)
      properties (patient_id, obs_id)
      label has_observation,

    e_recorded_during
      key (obs_id, encounter_id)
      source      key (obs_id)         references kg_observation (obs_id)
      destination key (encounter_id)   references kg_encounter   (encounter_id)
      properties (patient_id)
      label recorded_during,

    e_authored_by
      key (obs_id, practitioner_id)
      source      key (obs_id)            references kg_observation (obs_id)
      destination key (practitioner_id)   references kg_practitioner (practitioner_id)
      properties (patient_id)
      label authored_by,

    e_has_condition
      key (patient_id, cond_id)
      source      key (patient_id)  references kg_patient   (patient_id)
      destination key (cond_id)     references kg_condition (cond_id)
      label has_condition,

    e_had_procedure
      key (patient_id, proc_id)
      source      key (patient_id)  references kg_patient   (patient_id)
      destination key (proc_id)     references kg_procedure (proc_id)
      label had_procedure
  );
```
