## Setup Steps
### First, Setup a Local Oracle 23 ai Database
Follow instructions in [db-setup.md](setup.md).

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
Run the `load.sh` script.


