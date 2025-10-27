# Knowledge Graph Configuration

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
