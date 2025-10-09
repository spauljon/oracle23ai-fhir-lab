#!/usr/bin/env bash

set +x

bin_dir=$( cd "$(dirname "$0")" >/dev/null 2>&1 || exit ; pwd -P )
resources_dir=${bin_dir}/resources

trap '{ popd ; }' EXIT

pushd "${bin_dir}" || exit

## load shared/referenced resources
for f in ${resources_dir}/hospitalInformation*.json ${resources_dir}/practitionerInformation*.json; do
  [ -f "$f" ] || continue
  echo "POST $f"
  curl -sS -X POST -H "Content-Type: application/fhir+json" \
    --data-binary "@$f" http://localhost:8080/fhir
done

## ... and everything else
for f in ${resources_dir}/*.json; do
  echo "POST $f"
  curl -sS -X POST \
    -H "Content-Type: application/fhir+json" \
    --data-binary "@$f" http://localhost:8080/fhir
done
