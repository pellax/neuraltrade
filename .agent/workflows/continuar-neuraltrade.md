---
description: Continuar desarrollo NeuralTrade desde estado guardado
---

# Continuar NeuralTrade

Este workflow restaura el contexto de la sesión anterior.

## Pasos

1. **Leer estado guardado**
   ```
   Revisar .agent/SESSION_STATE.md
   ```

2. **Verificar skills disponibles**
   ```bash
   ls -la .agent/skills/
   ```

3. **Resumen de skills activas**

   | Skill | Rol |
   |-------|-----|
   | `ui-architect-pro` | UI/UX Designer |
   | `nexus-architect` | Solutions Architect |
   | `qa-sentinel` | SDET / Testing |
   | `cloud-nexus` | DevOps/SRE |
   | `typescript-craftsman` | TypeScript Expert |
   | `python-ml-architect` | ML Engineer |
   | `nextjs-trading-architect` | Frontend Engineer |
   | `flow-master` | Data Pipeline Engineer |

4. **Preguntar al usuario qué desea hacer**
   
   Opciones sugeridas:
   - Implementar un servicio específico
   - Diseñar componentes de UI
   - Configurar infraestructura
   - Escribir tests
   - Crear nuevas skills

## Estado Actual (2026-01-28)

- ✅ 9 skills creadas y funcionales
- ✅ Cobertura completa del stack
- ✅ Recursos y ejemplos incluidos
- ⏳ Pendiente: Implementación de servicios

## Estructura del Proyecto

```
NeuralTrade/
├── .agent/
│   ├── skills/           # 9 skills especializadas
│   ├── workflows/        # Workflows disponibles
│   └── SESSION_STATE.md  # Estado de sesión
├── apps/
│   └── dashboard/        # Next.js frontend
├── services/
│   ├── api-gateway/      # Express TypeScript
│   ├── ingestion/        # Data ingestion
│   ├── ml-engine/        # Python FastAPI
│   └── backtesting/      # Backtesting engine
├── packages/
│   └── shared-types/     # Tipos compartidos
└── infra/                # Terraform/K8s
```
