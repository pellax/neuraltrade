# Architecture Decision Record Template

Usa este template para documentar decisiones arquitectónicas importantes.

## ADR-XXX: [Título de la Decisión]

### Metadata
```yaml
Status: [Proposed | Accepted | Deprecated | Superseded]
Date: YYYY-MM-DD
Deciders: [Lista de personas involucradas]
Technical Story: [Link a ticket/issue si existe]
```

---

### Context

[Describe el contexto y el problema que enfrentamos. ¿Qué está pasando que requiere una decisión?]

**Fuerzas en juego:**
- [Fuerza 1: ej. "Necesitamos escalar a 100k usuarios"]
- [Fuerza 2: ej. "El equipo tiene experiencia en Python"]
- [Fuerza 3: ej. "Budget limitado para infraestructura"]

---

### Decision

**Elegimos**: [La decisión tomada en una oración]

[Justificación detallada de por qué esta opción]

---

### Options Considered

#### Opción 1: [Nombre]
```
Pros:
- [Ventaja 1]
- [Ventaja 2]

Cons:
- [Desventaja 1]
- [Desventaja 2]

Effort: [Bajo | Medio | Alto]
Risk: [Bajo | Medio | Alto]
```

#### Opción 2: [Nombre]
```
Pros:
- [Ventaja 1]
- [Ventaja 2]

Cons:
- [Desventaja 1]
- [Desventaja 2]

Effort: [Bajo | Medio | Alto]
Risk: [Bajo | Medio | Alto]
```

#### Opción 3: [Nombre]
```
Pros:
- [Ventaja 1]
- [Ventaja 2]

Cons:
- [Desventaja 1]
- [Desventaja 2]

Effort: [Bajo | Medio | Alto]
Risk: [Bajo | Medio | Alto]
```

---

### Consequences

**Positivas:**
- [Consecuencia positiva 1]
- [Consecuencia positiva 2]

**Negativas:**
- [Consecuencia negativa 1]
- [Consecuencia negativa 2]

**Riesgos identificados:**
- [Riesgo 1]: Mitigación → [cómo lo abordamos]
- [Riesgo 2]: Mitigación → [cómo lo abordamos]

---

### Follow-up Actions

- [ ] [Acción 1]
- [ ] [Acción 2]
- [ ] [Acción 3]

---

### Related ADRs

- [ADR-XXX: Título relacionado]
- [ADR-XXX: Título relacionado]

---

## Ejemplo Completo: ADR-001

### ADR-001: Usar PostgreSQL como Base de Datos Principal

#### Metadata
```yaml
Status: Accepted
Date: 2024-01-15
Deciders: Tech Lead, Backend Team
Technical Story: NEURAL-45
```

#### Context

NeuralTrade necesita persistir datos de usuarios, órdenes de trading, y posiciones. Los requerimientos clave son:

**Fuerzas en juego:**
- Necesitamos transacciones ACID para operaciones financieras
- El volumen inicial es ~10k usuarios, proyectado a 100k en 2 años
- El equipo tiene experiencia fuerte en SQL
- Necesitamos soporte para queries complejas (reportes, analytics)
- Budget: Preferimos soluciones open-source

#### Decision

**Elegimos**: PostgreSQL como base de datos principal para todos los servicios.

PostgreSQL ofrece el mejor balance entre features, rendimiento y costo para nuestro caso de uso. La consistencia ACID es crítica para operaciones financieras, y el ecosistema es maduro.

#### Options Considered

##### Opción 1: PostgreSQL
```
Pros:
- ACID completo
- JSONB para datos semi-estructurados
- Extensiones (TimescaleDB para time-series)
- Gran comunidad y soporte
- Gratuito y open-source

Cons:
- Escalado horizontal requiere más trabajo
- Menos flexible que NoSQL para esquemas cambiantes

Effort: Bajo (equipo tiene experiencia)
Risk: Bajo (tecnología madura)
```

##### Opción 2: MongoDB
```
Pros:
- Esquema flexible
- Escalado horizontal nativo
- Buen para datos no estructurados

Cons:
- Sin transacciones ACID robustas (históricamente)
- Inconsistencias potenciales en datos financieros
- Queries complejas más difíciles

Effort: Medio (curva de aprendizaje)
Risk: Medio (para datos financieros)
```

##### Opción 3: CockroachDB
```
Pros:
- PostgreSQL compatible
- Escalado horizontal nativo
- Altamente disponible

Cons:
- Latencia ligeramente mayor
- Costo de infraestructura mayor
- Menos maduro que PostgreSQL

Effort: Bajo (compatible con PG)
Risk: Medio (menos battle-tested)
```

#### Consequences

**Positivas:**
- Garantías ACID para todas las operaciones financieras
- El equipo puede empezar a desarrollar inmediatamente
- Extensibilidad con TimescaleDB para datos de mercado
- Costo operacional bajo (Supabase, RDS, o self-hosted)

**Negativas:**
- Si llegamos a 1M+ usuarios, necesitaremos sharding o read replicas
- Migraciones de esquema requieren más cuidado

**Riesgos identificados:**
- Escalabilidad a largo plazo: Mitigación → Diseñar con partitioning desde el día 1
- Vendor lock-in en cloud: Mitigación → Usar features estándar de PostgreSQL

#### Follow-up Actions

- [x] Configurar PostgreSQL en desarrollo
- [x] Definir estrategia de backups
- [ ] Implementar partitioning para tablas de órdenes
- [ ] Configurar read replicas para analytics

#### Related ADRs

- ADR-002: Usar TimescaleDB para datos de mercado
- ADR-003: Estrategia de caching con Redis
