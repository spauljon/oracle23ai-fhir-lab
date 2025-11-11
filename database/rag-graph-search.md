# RAG Property Graph Search 
## Schema
We are starting with this property graph definition:

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

## Sample Graph Searches
### Filter observations by LOINC (code/system) and time window
```sql
SELECT t.patient_id, t.obs_id, t.code, t.effective_start
FROM GRAPH_TABLE(
  fhir_pg
  MATCH (p IS patient)-[ho IS has_observation]->(o IS observation)
  COLUMNS (
    p.patient_id       AS patient_id,
    o.obs_id           AS obs_id,
    o.code        	   AS code,
    o.effective_start  AS effective_start
  )
) t
WHERE t.patient_id   = 11331
  AND t.code    IN ('8480-6','8462-4', '2339-0')   -- systolic/diastolic BP LOINC
ORDER BY t.effective_start DESC;
```

### Latest value per code (windowed pick-latest)
```sql
WITH obs AS (
  SELECT t.*, ROW_NUMBER() OVER (PARTITION BY t.code ORDER BY t.effective_start DESC) rn
  FROM GRAPH_TABLE(
    fhir_pg
    MATCH (p IS patient)-[ho IS has_observation]->(o IS observation)
    COLUMNS (p.patient_id,o.obs_id,o.code,o.effective_start,o.value_num,o.unit)
  ) t
  WHERE t.patient_id = 11331 AND t.code IN ('8480-6','8462-4')
)
SELECT * FROM obs WHERE rn < 3 ORDER BY code, effective_start desc;
```

### Encounter context: observations recorded during which encounter?
```sql

```