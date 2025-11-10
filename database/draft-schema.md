vertex tables
```sql
-- PATIENT (no time axis)
CREATE TABLE kg_patient (
  patient_id   VARCHAR2(64) PRIMARY KEY,
  birth_date   DATE,
  gender       VARCHAR2(16),
  json         CLOB
)
PARTITION BY HASH (patient_id) PARTITIONS 16;

CREATE INDEX x_pat_gender ON kg_patient(gender);

-- ENCOUNTER (time axis: period_start)
CREATE TABLE kg_encounter (
  encounter_id   VARCHAR2(64) PRIMARY KEY,
  patient_id     VARCHAR2(64) NOT NULL,
  period_start   TIMESTAMP WITH TIME ZONE,
  period_end     TIMESTAMP WITH TIME ZONE,
  class_code     VARCHAR2(40),
  type_code      VARCHAR2(80),
  json           CLOB
)
PARTITION BY RANGE (period_start)
INTERVAL (NUMTOYMINTERVAL(1,'MONTH'))
SUBPARTITION BY HASH (patient_id) SUBPARTITIONS 16
(
  PARTITION p0 VALUES LESS THAN (TIMESTAMP '2020-01-01 00:00:00 UTC')
);

CREATE INDEX x_enc_pid   ON kg_encounter(patient_id);
CREATE INDEX x_enc_class ON kg_encounter(class_code);

-- OBSERVATION (time axis: effective_start)
CREATE TABLE kg_observation (
  obs_id          VARCHAR2(64) PRIMARY KEY,
  patient_id      VARCHAR2(64) NOT NULL,
  encounter_id    VARCHAR2(64),
  loinc_code      VARCHAR2(80),
  effective_start TIMESTAMP WITH TIME ZONE,
  value_num       NUMBER,
  unit            VARCHAR2(40),
  author_id       VARCHAR2(64),
  device_id       VARCHAR2(64),
  json            CLOB
)
PARTITION BY RANGE (effective_start)
INTERVAL (NUMTOYMINTERVAL(1,'MONTH'))
SUBPARTITION BY HASH (patient_id) SUBPARTITIONS 16
(
  PARTITION p0 VALUES LESS THAN (TIMESTAMP '2020-01-01 00:00:00 UTC')
);

CREATE INDEX x_obs_pid      ON kg_observation(patient_id);
CREATE INDEX x_obs_code_ts  ON kg_observation(loinc_code, effective_start);
CREATE INDEX x_obs_enc      ON kg_observation(encounter_id);

-- CONDITION (time axis: onset; use onsetDateTime or recordedDate if present)
CREATE TABLE kg_condition (
  cond_id       VARCHAR2(64) PRIMARY KEY,
  patient_id    VARCHAR2(64) NOT NULL,
  snomed_code   VARCHAR2(80),
  clinical_status VARCHAR2(40),
  onset         TIMESTAMP WITH TIME ZONE,
  abatement     TIMESTAMP WITH TIME ZONE,
  json          CLOB
)
PARTITION BY RANGE (onset)
INTERVAL (NUMTOYMINTERVAL(1,'MONTH'))
SUBPARTITION BY HASH (patient_id) SUBPARTITIONS 16
(
  PARTITION p0 VALUES LESS THAN (TIMESTAMP '2020-01-01 00:00:00 UTC')
);

CREATE INDEX x_cond_pid     ON kg_condition(patient_id);
CREATE INDEX x_cond_code    ON kg_condition(snomed_code);

-- PROCEDURE (time axis: performed_start)
CREATE TABLE kg_procedure (
  proc_id        VARCHAR2(64) PRIMARY KEY,
  patient_id     VARCHAR2(64) NOT NULL,
  encounter_id   VARCHAR2(64),
  snomed_code    VARCHAR2(80),
  performed_start TIMESTAMP WITH TIME ZONE,
  performer_id   VARCHAR2(64),
  json           CLOB
)
PARTITION BY RANGE (performed_start)
INTERVAL (NUMTOYMINTERVAL(1,'MONTH'))
SUBPARTITION BY HASH (patient_id) SUBPARTITIONS 16
(
  PARTITION p0 VALUES LESS THAN (TIMESTAMP '2020-01-01 00:00:00 UTC')
);

CREATE INDEX x_proc_pid   ON kg_procedure(patient_id);
CREATE INDEX x_proc_code  ON kg_procedure(snomed_code);

-- DIAGNOSTIC REPORT (time axis: issued)
CREATE TABLE kg_diagnostic_report (
  dr_id       VARCHAR2(64) PRIMARY KEY,
  patient_id  VARCHAR2(64) NOT NULL,
  code        VARCHAR2(80),
  issued      TIMESTAMP WITH TIME ZONE,
  json        CLOB
)
PARTITION BY RANGE (issued)
INTERVAL (NUMTOYMINTERVAL(1,'MONTH'))
SUBPARTITION BY HASH (patient_id) SUBPARTITIONS 16
(
  PARTITION p0 VALUES LESS THAN (TIMESTAMP '2020-01-01 00:00:00 UTC')
);

CREATE INDEX x_dr_pid ON kg_diagnostic_report(patient_id);

-- MEDICATION REQUEST (time axis: authored_on)
CREATE TABLE kg_med_request (
  mr_id        VARCHAR2(64) PRIMARY KEY,
  patient_id   VARCHAR2(64) NOT NULL,
  practitioner_id VARCHAR2(64),
  med_code     VARCHAR2(80),
  status       VARCHAR2(40),
  authored_on  TIMESTAMP WITH TIME ZONE,
  json         CLOB
)
PARTITION BY RANGE (authored_on)
INTERVAL (NUMTOYMINTERVAL(1,'MONTH'))
SUBPARTITION BY HASH (patient_id) SUBPARTITIONS 16
(
  PARTITION p0 VALUES LESS THAN (TIMESTAMP '2020-01-01 00:00:00 UTC')
);

CREATE INDEX x_mr_pid   ON kg_med_request(patient_id);
CREATE INDEX x_mr_code  ON kg_med_request(med_code);

-- MEDICATION ADMIN (time axis: effective_start)
CREATE TABLE kg_med_admin (
  ma_id         VARCHAR2(64) PRIMARY KEY,
  patient_id    VARCHAR2(64) NOT NULL,
  practitioner_id VARCHAR2(64),
  med_code      VARCHAR2(80),
  effective_start TIMESTAMP WITH TIME ZONE,
  json          CLOB
)
PARTITION BY RANGE (effective_start)
INTERVAL (NUMTOYMINTERVAL(1,'MONTH'))
SUBPARTITION BY HASH (patient_id) SUBPARTITIONS 16
(
  PARTITION p0 VALUES LESS THAN (TIMESTAMP '2020-01-01 00:00:00 UTC')
);

CREATE INDEX x_ma_pid   ON kg_med_admin(patient_id);
CREATE INDEX x_ma_code  ON kg_med_admin(med_code);

-- PRACTITIONER / ORGANIZATION / LOCATION (usually smaller)
CREATE TABLE kg_practitioner (
  practitioner_id VARCHAR2(64) PRIMARY KEY,
  name            VARCHAR2(400),
  json            CLOB
);

CREATE TABLE kg_organization (
  org_id   VARCHAR2(64) PRIMARY KEY,
  name     VARCHAR2(400),
  type     VARCHAR2(80),
  json     CLOB
);

CREATE TABLE kg_location (
  location_id VARCHAR2(64) PRIMARY KEY,
  name        VARCHAR2(400),
  type        VARCHAR2(80),
  json        CLOB
);
```

Edge Tables

```sql
-- Patient -> Observation
CREATE TABLE e_pat_has_obs (
  patient_id      VARCHAR2(64) NOT NULL,
  obs_id          VARCHAR2(64) NOT NULL,
  effective_start TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (patient_id, obs_id)
)
PARTITION BY RANGE (effective_start)
INTERVAL (NUMTOYMINTERVAL(1,'MONTH'))
SUBPARTITION BY HASH (patient_id) SUBPARTITIONS 16
(
  PARTITION p0 VALUES LESS THAN (TIMESTAMP '2020-01-01 00:00:00 UTC')
);

CREATE INDEX x_epho_obs ON e_pat_has_obs(obs_id);

-- Observation -> Encounter
CREATE TABLE e_obs_in_enc (
  obs_id        VARCHAR2(64) NOT NULL,
  encounter_id  VARCHAR2(64) NOT NULL,
  period_start  TIMESTAMP WITH TIME ZONE,  -- denormalized from Encounter for pruning
  PRIMARY KEY (obs_id, encounter_id)
)
PARTITION BY RANGE (period_start)
INTERVAL (NUMTOYMINTERVAL(1,'MONTH'));

-- Observation -> Practitioner / Device
CREATE TABLE e_obs_authored_by (
  obs_id          VARCHAR2(64) NOT NULL,
  practitioner_id VARCHAR2(64) NOT NULL,
  PRIMARY KEY (obs_id, practitioner_id)
);

CREATE TABLE e_obs_measured_with (
  obs_id   VARCHAR2(64) NOT NULL,
  device_id VARCHAR2(64) NOT NULL,
  PRIMARY KEY (obs_id, device_id)
);

-- Patient -> Condition / Procedure
CREATE TABLE e_pat_has_cond (
  patient_id   VARCHAR2(64) NOT NULL,
  cond_id      VARCHAR2(64) NOT NULL,
  onset        TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (patient_id, cond_id)
)
PARTITION BY RANGE (onset)
INTERVAL (NUMTOYMINTERVAL(1,'MONTH'))
SUBPARTITION BY HASH (patient_id) SUBPARTITIONS 16
(
  PARTITION p0 VALUES LESS THAN (TIMESTAMP '2020-01-01 00:00:00 UTC')
);

CREATE TABLE e_pat_had_proc (
  patient_id     VARCHAR2(64) NOT NULL,
  proc_id        VARCHAR2(64) NOT NULL,
  performed_start TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (patient_id, proc_id)
)
PARTITION BY RANGE (performed_start)
INTERVAL (NUMTOYMINTERVAL(1,'MONTH'))
SUBPARTITION BY HASH (patient_id) SUBPARTITIONS 16
(
  PARTITION p0 VALUES LESS THAN (TIMESTAMP '2020-01-01 00:00:00 UTC')
);

-- DiagnosticReport -> Patient, DiagnosticReport -> Observation
CREATE TABLE e_dr_for_patient (
  dr_id      VARCHAR2(64) NOT NULL,
  patient_id VARCHAR2(64) NOT NULL,
  issued     TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (dr_id, patient_id)
)
PARTITION BY RANGE (issued)
INTERVAL (NUMTOYMINTERVAL(1,'MONTH'));

CREATE TABLE e_dr_derives_obs (
  dr_id      VARCHAR2(64) NOT NULL,
  obs_id     VARCHAR2(64) NOT NULL,
  PRIMARY KEY (dr_id, obs_id)
);
```

Property Graph 

```sql
CREATE PROPERTY GRAPH fhir_pg
  VERTEX TABLE kg_patient           KEY (patient_id)     LABEL patient
  VERTEX TABLE kg_observation       KEY (obs_id)         LABEL observation
  VERTEX TABLE kg_encounter         KEY (encounter_id)   LABEL encounter
  VERTEX TABLE kg_condition         KEY (cond_id)        LABEL condition
  VERTEX TABLE kg_procedure         KEY (proc_id)        LABEL procedure
  VERTEX TABLE kg_diagnostic_report KEY (dr_id)          LABEL diagnostic_report
  VERTEX TABLE kg_med_request       KEY (mr_id)          LABEL medication_request
  VERTEX TABLE kg_med_admin         KEY (ma_id)          LABEL medication_admin
  VERTEX TABLE kg_practitioner      KEY (practitioner_id) LABEL practitioner
  VERTEX TABLE kg_organization      KEY (org_id)         LABEL organization
  VERTEX TABLE kg_location          KEY (location_id)    LABEL location

  EDGE TABLE e_pat_has_obs
    KEY (patient_id, obs_id)
    SOURCE KEY (patient_id) REFERENCES kg_patient
    DESTINATION KEY (obs_id) REFERENCES kg_observation
    LABEL has_observation

  EDGE TABLE e_obs_in_enc
    KEY (obs_id, encounter_id)
    SOURCE KEY (obs_id) REFERENCES kg_observation
    DESTINATION KEY (encounter_id) REFERENCES kg_encounter
    LABEL recorded_during

  EDGE TABLE e_obs_authored_by
    KEY (obs_id, practitioner_id)
    SOURCE KEY (obs_id) REFERENCES kg_observation
    DESTINATION KEY (practitioner_id) REFERENCES kg_practitioner
    LABEL authored_by

  EDGE TABLE e_obs_measured_with
    KEY (obs_id, device_id)
    SOURCE KEY (obs_id) REFERENCES kg_observation
    DESTINATION KEY (device_id) REFERENCES kg_location /* or a Device table if you add it */
    LABEL measured_with

  EDGE TABLE e_pat_has_cond
    KEY (patient_id, cond_id)
    SOURCE KEY (patient_id) REFERENCES kg_patient
    DESTINATION KEY (cond_id) REFERENCES kg_condition
    LABEL has_condition

  EDGE TABLE e_pat_had_proc
    KEY (patient_id, proc_id)
    SOURCE KEY (patient_id) REFERENCES kg_patient
    DESTINATION KEY (proc_id) REFERENCES kg_procedure
    LABEL had_procedure

  EDGE TABLE e_dr_for_patient
    KEY (dr_id, patient_id)
    SOURCE KEY (dr_id) REFERENCES kg_diagnostic_report
    DESTINATION KEY (patient_id) REFERENCES kg_patient
    LABEL for_patient

  EDGE TABLE e_dr_derives_obs
    KEY (dr_id, obs_id)
    SOURCE KEY (dr_id) REFERENCES kg_diagnostic_report
    DESTINATION KEY (obs_id) REFERENCES kg_observation
    LABEL derives_finding;
```

