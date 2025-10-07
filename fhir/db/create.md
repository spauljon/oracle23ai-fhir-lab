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
