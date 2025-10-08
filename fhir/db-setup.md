## Setup Steps
### Launch the local Oracle 23 ai instance
> Hint: use the smart fhir compose scripts

Then shell into the container
### Create the AI PDB
#### Start SQL*Plus as Admin
```sql
sqlplus / as sysdba
        
show con_name; 
show pdbs;
```

#### Set the Oracle Managed File Destination
```sql
alter system set db_create_file_dest = '/opt/oracle/oradata' scope=both;
```

#### Create the PDB
```sql
create pluggable database pdbfhirai admin user hapi identified by "tiger" roles = (dba);
```

#### Open the PDB (and Persist the Open State)
```sql
alter pluggable database pdbfhirai open;
alter pluggable database pdbfhirai save state;
```

#### Switch to the PDB
```sql
alter session set container=pdbfhirai;
show con_name;
```

#### Establish CHAR Length Semantics
```sql
alter system set nls_length_semantics=char scope=both;
```

#### Create FHIR Tablespace
```sql
create tablespace fhir_ts;
```

#### Create the FHIR App User
```sql
create user fhir_app identified by "fhir_app"
  default tablespace fhir_ts
  quota unlimited on fhir_ts;
grant create session to fhir_app;
grant create table, create view, create sequence, create procedure, create trigger, create index, create synonym, create type to fhir_app;
grant create job to fhir_app;
```
### Load a Sample FHIR Dataset
#### Generate Synthea Resources
```shell
# 1) Get Synthea
git clone https://github.com/synthetichealth/synthea.git
cd synthea

# 2) Ensure R4 + transaction bundles in properties
# (Create a local override file that Synthea will read)
cat > src/main/resources/synthea-local.properties <<'PROPS'
exporter.fhir.export=true
exporter.hospital.fhir.export=true
exporter.practitioner.fhir.export=true
exporter.provider.fhir.export=true
exporter.patient.deceased=false

# Make sure we emit FHIR R4 and transaction bundles
exporter.fhir.transaction_bundle=true
exporter.fhir.version=R4

# Keep everything in one place
exporter.baseDirectory=./output
PROPS

# 3) Build (first time takes a bit)
./gradlew build -x test

# 4) Generate 200 patients (pick a state/city if you want consistent providers)
# Examples: "Massachusetts", "Maryland", etc. Omit location to randomize.
./run_synthea -p 200 Massachusetts
```
#### Load the Generated Resources
First, 
