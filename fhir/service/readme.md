# FHIR Service Configuration
## Summary
The FHIR service (jps starter) has a preconfigured NATS message subscription channel that publishes CREATE, UPDATE, AND DELETE operations for all FHIR Observations.
## Subscription Messaging
The `NatsConfig` spring `configuration` class binds the following NATS message subscription to a delivery producer that marshals observations to messages, and publishes them to `subject` `fhir.obs.vector` in a corresponding locally-deployed NATS service.
```json
{
  "id": "nats-observation-subscription",
  "meta": {
    "tag": [
      {
        "system": "https://wiki.mobilehealth.va.gov/x/Onc1C",
        "code": "34a800fa-ffa9-4cb9-99ed-0aa4d0fEcef2",
        "display": "SMART PGD FHIR Implementation Team"
      }
    ]
  },
  "resourceType": "Subscription",
  "criteria": "Observation?",
  "reason": "Sync Observations to Vector Embeddings",
  "status": "active",
  "channel": {
    "type": "message",
    "endpoint": "channel:fhirObservation",
    "payload": "application/fhir+json",
    "extension": [
      {
        "url": "http://hapifhir.io/fhir/StructureDefinition/subscription-send-delete-messages",
        "valueBoolean": true
      }
    ]
  }
}
```

> _N.B.  The channel name - `fhirObservation` - is also the name of the subscribable spring messaging channel bean (that marshals observations to messages and publishes them to NATS)._

## NATS Message Consumption
This project consumes `fhir.obs.vector` messages and persists them to the `fhir_vec.obs_vec_active` table.
