# RAG Search Capabilities
## Prerequisites
- FHIR Service must be deployed locally and provisioned with a reasonable synthea population.
- Oracle 23ai database must have a vector schema as detailed in `db-setup.md`.
- The vector table `obs_vec_active` must have content provided by the NATS pub/sub mechanism defined in this 
  repository for one or more patients.

## RAG Query Patterns
### 1.  Pure vector KNN for a natural-language question
To execute a nearest-neighbor (semantic) query like the following, that finds the 10 rows semantically closest to a 
language expression bound to parameter `q_emb`, we must request an embedding from the openai api (for the same 
model used during row ingestion).
```sql
select
  id, observation_id, patient_id, effective_start,
  regexp_substr(code_text, '\|([0-9-]+)\|', 1, 1, null, 1) as loinc_code,
  substr(display_text, 1, 160) as snippet,
  vector_distance(embedding, :p_embedding) as vdist
from obs_vec_active
where patient_id = 11331
order by vdist asc
fetch first 10 rows only;
```
For example, if I want to find the top 10 observations for patient 11331 related to `housing insecurity`, I must  
request invoke the openai embedding api for that phrase.  I then bind the returned vector to the q_emb statement 
parameter, and execute the select statement.

See the `query.ts` module for a working example.

Here are sample results for this search:

```text
┌─────────┬─────┬────────────────┬────────────┬──────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬─────────┬────────────────────┐
│ (index) │ ID  │ OBSERVATION_ID │ PATIENT_ID │ EFFECTIVE_START          │ CODE_TEXT                                                                                                         │ SNIPPET │ VDIST              │
├─────────┼─────┼────────────────┼────────────┼──────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────┼────────────────────┤
│ 0       │ 405 │ '12299'        │ '11331'    │ 2022-12-09T14:04:10.000Z │ 'http://loinc.org|93033-9|Are you worried about losing your housing?::Are you worried about losing your housing?' │ [Lob]   │ 0.6197527617186063 │
│ 1       │ 350 │ '12212'        │ '11331'    │ 2021-12-03T14:00:26.000Z │ 'http://loinc.org|93033-9|Are you worried about losing your housing?::Are you worried about losing your housing?' │ [Lob]   │ 0.6235576257287134 │
│ 2       │ 173 │ '12085'        │ '11331'    │ 2020-11-27T14:12:31.000Z │ 'http://loinc.org|93033-9|Are you worried about losing your housing?::Are you worried about losing your housing?' │ [Lob]   │ 0.6265002995231501 │
│ 3       │ 121 │ '12021'        │ '11331'    │ 2019-11-22T14:04:43.000Z │ 'http://loinc.org|93033-9|Are you worried about losing your housing?::Are you worried about losing your housing?' │ [Lob]   │ 0.6315567563580007 │
│ 4       │ 60  │ '11833'        │ '11331'    │ 2018-11-16T14:11:01.000Z │ 'http://loinc.org|93033-9|Are you worried about losing your housing?::Are you worried about losing your housing?' │ [Lob]   │ 0.631708925601557  │
│ 5       │ 37  │ '11941'        │ '11331'    │ 2019-03-22T13:54:45.000Z │ 'http://loinc.org|93033-9|Are you worried about losing your housing?::Are you worried about losing your housing?' │ [Lob]   │ 0.6334731831166016 │
│ 6       │ 643 │ '12475'        │ '11331'    │ 2024-12-20T14:00:19.000Z │ 'http://loinc.org|93033-9|Are you worried about losing your housing?::Are you worried about losing your housing?' │ [Lob]   │ 0.6354322481920702 │
│ 7       │ 406 │ '12299'        │ '11331'    │ 2022-12-09T14:04:10.000Z │ 'http://loinc.org|71802-3|Housing status::Housing status'                                                         │ [Lob]   │ 0.6411259963848123 │
│ 8       │ 561 │ '12378'        │ '11331'    │ 2023-12-15T14:02:33.000Z │ 'http://loinc.org|93033-9|Are you worried about losing your housing?::Are you worried about losing your housing?' │ [Lob]   │ 0.6420812719012347 │
│ 9       │ 174 │ '12085'        │ '11331'    │ 2020-11-27T14:12:31.000Z │ 'http://loinc.org|71802-3|Housing status::Housing status'                                                         │ [Lob]   │ 0.6453993752850608 │
└─────────┴─────┴────────────────┴────────────┴──────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴─────────┴────────────────────┘
[
```
Note that the observation and patient ids are resolvable in the system-of-record database; e.g., observation 11833 
is (snipped for brevity):

```json
{
  "resourceType": "Observation",
  "id": "11833",
  "meta": {
    "versionId": "1",
    "lastUpdated": "2025-10-08T05:11:51.605-04:00",
    "profile": [
      "http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-sdoh-assessment",
      "http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-survey"
    ]
  },
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "survey",
          "display": "Survey"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "93025-5",
        "display": "Protocol for Responding to and Assessing Patients' Assets, Risks, and Experiences [PRAPARE]"
      }
    ],
    "text": "Protocol for Responding to and Assessing Patients' Assets, Risks, and Experiences [PRAPARE]"
  },
  "subject": {
    "reference": "Patient/11331"
  },
  "encounter": {
    "reference": "Encounter/11796"
  },
  "effectiveDateTime": "2018-11-16T09:11:01-05:00",
  "issued": "2018-11-16T09:11:01.655-05:00",
  "component": [
    {
      "code": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "76501-6",
            "display": "Within the last year, have you been afraid of your partner or ex-partner?"
          }
        ],
        "text": "Within the last year, have you been afraid of your partner or ex-partner?"
      },
      "valueCodeableConcept": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "LA32-8",
            "display": "No"
          }
        ],
        "text": "No"
      }
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "93026-3",
            "display": "Do you feel physically and emotionally safe where you currently live?"
          }
        ],
        "text": "Do you feel physically and emotionally safe where you currently live?"
      },
      "valueCodeableConcept": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "LA33-6",
            "display": "Yes"
          }
        ],
        "text": "Yes"
      }
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "93027-1",
            "display": "Are you a refugee?"
          }
        ],
        "text": "Are you a refugee?"
      },
      "valueCodeableConcept": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "LA32-8",
            "display": "No"
          }
        ],
        "text": "No"
      }
    }
  ]
}
```

### 2. Pure text (Oracle Text) with ranking
This example illustrates full text index ranking:

```sql
select
    id, observation_id, patient_id, effective_start,
    score(1) as bm25,
    substr(display_text, 1, 160) as snippet
from obs_vec_active
where patient_id = 11331
  and contains(display_text, 'blood pressure', 1) > 0
order by bm25 desc
fetch first 10 rows only;
```

Here are sample results:
<div style="font-size: small">

|ID|OBSERVATION_ID|PATIENT_ID|EFFECTIVE_START|BM25|SNIPPET|
|--|--------------|----------|---------------|----|-------|
|5|11923|11331|2019-03-22 09:21:57.000 -0400|13|11923 11331 2019-03-22T09:21:57-04:00 2019-03-22T09:21:57-04:00 http://loinc.org&#124;8462-4&#124;Diastolic Blood Pressure::Diastolic Blood Pressure QTY:68&#124;mm[Hg]&#124;http://|
|6|11923|11331|2019-03-22 09:21:57.000 -0400|13|11923 11331 2019-03-22T09:21:57-04:00 2019-03-22T09:21:57-04:00 http://loinc.org&#124;8480-6&#124;Systolic Blood Pressure::Systolic Blood Pressure QTY:98&#124;mm[Hg]&#124;http://un|
|89|12003|11331|2019-11-22 08:21:57.000 -0500|13|12003 11331 2019-11-22T08:21:57-05:00 2019-11-22T08:21:57-05:00 http://loinc.org&#124;8462-4&#124;Diastolic Blood Pressure::Diastolic Blood Pressure QTY:66&#124;mm[Hg]&#124;http://|
|90|12003|11331|2019-11-22 08:21:57.000 -0500|13|12003 11331 2019-11-22T08:21:57-05:00 2019-11-22T08:21:57-05:00 http://loinc.org&#124;8480-6&#124;Systolic Blood Pressure::Systolic Blood Pressure QTY:93&#124;mm[Hg]&#124;http://un|
|141|12067|11331|2020-11-27 08:21:57.000 -0500|13|12067 11331 2020-11-27T08:21:57-05:00 2020-11-27T08:21:57-05:00 http://loinc.org&#124;8462-4&#124;Diastolic Blood Pressure::Diastolic Blood Pressure QTY:70&#124;mm[Hg]&#124;http://|
|142|12067|11331|2020-11-27 08:21:57.000 -0500|13|12067 11331 2020-11-27T08:21:57-05:00 2020-11-27T08:21:57-05:00 http://loinc.org&#124;8480-6&#124;Systolic Blood Pressure::Systolic Blood Pressure QTY:97&#124;mm[Hg]&#124;http://un|
|201|12194|11331|2021-12-03 08:21:57.000 -0500|13|12194 11331 2021-12-03T08:21:57-05:00 2021-12-03T08:21:57-05:00 http://loinc.org&#124;8462-4&#124;Diastolic Blood Pressure::Diastolic Blood Pressure QTY:71&#124;mm[Hg]&#124;http://|
|202|12194|11331|2021-12-03 08:21:57.000 -0500|13|12194 11331 2021-12-03T08:21:57-05:00 2021-12-03T08:21:57-05:00 http://loinc.org&#124;8480-6&#124;Systolic Blood Pressure::Systolic Blood Pressure QTY:102&#124;mm[Hg]&#124;http://u|
|373|12281|11331|2022-12-09 08:21:57.000 -0500|13|12281 11331 2022-12-09T08:21:57-05:00 2022-12-09T08:21:57-05:00 http://loinc.org&#124;8462-4&#124;Diastolic Blood Pressure::Diastolic Blood Pressure QTY:69&#124;mm[Hg]&#124;http://|
|374|12281|11331|2022-12-09 08:21:57.000 -0500|13|12281 11331 2022-12-09T08:21:57-05:00 2022-12-09T08:21:57-05:00 http://loinc.org&#124;8480-6&#124;Systolic Blood Pressure::Systolic Blood Pressure QTY:90&#124;mm[Hg]&#124;http://un|
</div>

Note: BM25 indicates the ranking among the top 25 best matches.

### 3.  Hybrid rank: text + vector
- Binds both a text query and a vector embedding in the same query
- Simple linear fusion; can tune weights to suit

Here is a SQL example:

```sql
with c as (
  select
    id, observation_id, patient_id, effective_start, display_text, embedding,
    score(1) as bm25
  from obs_vec_active
  where patient_id = 11331
    and contains(display_text, :q, 1) > 0
)
select
  id, observation_id, patient_id, effective_start,
  substr(display_text, 1, 200) as snippet,
  bm25,
  vector_distance(embedding, :q_emb) as vdist,
  (bm25 * 1.0) + ( 10.0 / (1e-6 + vector_distance(embedding, :q_emb)) ) as hybrid_score
from c
order by hybrid_score desc
fetch first 10 rows only;
```
Note that the vector embedding bindings require a programming language both to create and submit (it is possible but 
unwieldy to include a 1536 element vector literal in SQL).

See `query.ts` for a working example.

Here are sample results for `q=housing` and `q_emb='housing insecurity'`:
```text
┌─────────┬─────┬────────────────┬────────────┬──────────────────────────┬─────────┬──────┬────────────────────┬────────────────────┐
│ (index) │ ID  │ OBSERVATION_ID │ PATIENT_ID │ EFFECTIVE_START          │ SNIPPET │ BM25 │ VDIST              │ HYBRID_SCORE       │
├─────────┼─────┼────────────────┼────────────┼──────────────────────────┼─────────┼──────┼────────────────────┼────────────────────┤
│ 0       │ 406 │ '12299'        │ '11331'    │ 2022-12-09T14:04:10.000Z │ [Lob]   │ 29   │ 0.6410389001690605 │ 44.599652997204565 │
│ 1       │ 174 │ '12085'        │ '11331'    │ 2020-11-27T14:12:31.000Z │ [Lob]   │ 29   │ 0.6453058211480411 │ 44.496504410428166 │
│ 2       │ 61  │ '11833'        │ '11331'    │ 2018-11-16T14:11:01.000Z │ [Lob]   │ 29   │ 0.649239269522923  │ 44.402618213051134 │
│ 3       │ 644 │ '12475'        │ '11331'    │ 2024-12-20T14:00:19.000Z │ [Lob]   │ 29   │ 0.6508249640662667 │ 44.36509074948615  │
│ 4       │ 122 │ '12021'        │ '11331'    │ 2019-11-22T14:04:43.000Z │ [Lob]   │ 29   │ 0.6520185902524014 │ 44.33696249238298  │
│ 5       │ 38  │ '11941'        │ '11331'    │ 2019-03-22T13:54:45.000Z │ [Lob]   │ 29   │ 0.6531227233085246 │ 44.31103471382583  │
│ 6       │ 351 │ '12212'        │ '11331'    │ 2021-12-03T14:00:26.000Z │ [Lob]   │ 29   │ 0.6551849671575023 │ 44.26284215668506  │
│ 7       │ 562 │ '12378'        │ '11331'    │ 2023-12-15T14:02:33.000Z │ [Lob]   │ 29   │ 0.6580443193073479 │ 44.196521738846045 │
│ 8       │ 405 │ '12299'        │ '11331'    │ 2022-12-09T14:04:10.000Z │ [Lob]   │ 29   │ 0.6196651512252378 │ 31.137721868828002 │
│ 9       │ 350 │ '12212'        │ '11331'    │ 2021-12-03T14:00:26.000Z │ [Lob]   │ 29   │ 0.6234639179253206 │ 31.039394860061414 │
└─────────┴─────┴────────────────┴────────────┴──────────────────────────┴─────────┴──────┴────────────────────┴────────────────────┘

```