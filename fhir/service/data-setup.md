## Setup Steps
### First, Setup a Local Oracle 23 ai Database
Follow instructions in [db-setup.md](setup.md).

### Load a Sample FHIR Dataset
#### Generate Synthea Resources
```shell
# 1) Get Synthea
git clone https://github.com/synthetichealth/synthea.git
cd synthea

# 2) Build (first time takes a bit)
./gradlew build check

# 3) Generate n patients (pick a state/city if you want consistent providers)
# Examples: "Massachusetts", "Maryland", etc. Omit location to randomize.
./run_synthea -p 20 Massachusetts
```
#### Load the Generated Resources
Run the `load.sh` script.


