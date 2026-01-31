---
description: Regla de seguridad crítica para credenciales de pago - NUNCA usar credenciales reales en desarrollo
---

# 🚨 REGLA DE SEGURIDAD CRÍTICA: Credenciales de Pago

## Prohibición Absoluta

**JAMÁS, bajo ninguna circunstancia, el agente utilizará, sugerirá, o incluirá credenciales de pago REALES mientras se esté trabajando en entorno local o de desarrollo.**

## Identificación de Entorno

El agente DEBE verificar el entorno antes de cualquier operación relacionada con pagos:

```bash
# Variables que indican entorno de desarrollo/local:
NODE_ENV=development
NODE_ENV=test
NEXT_PUBLIC_ENV=development
STRIPE_MODE=test
```

## Credenciales Permitidas en Desarrollo

### Stripe Test Mode
- **Publishable Key**: Solo claves que empiecen con `pk_test_`
- **Secret Key**: Solo claves que empiecen con `sk_test_`
- **Webhook Secret**: Solo secretos que empiecen con `whsec_test_` o similar

### Tarjetas de Prueba de Stripe
Las únicas tarjetas permitidas en desarrollo son las de prueba de Stripe:

| Número | Descripción |
|--------|-------------|
| 4242 4242 4242 4242 | Visa (éxito) |
| 4000 0000 0000 3220 | 3D Secure requerido |
| 4000 0000 0000 9995 | Fondos insuficientes |
| 4000 0000 0000 0002 | Tarjeta rechazada |

## Acciones Prohibidas

1. ❌ Incluir claves `pk_live_` o `sk_live_` en código o configuración
2. ❌ Procesar pagos reales en localhost o entornos de prueba
3. ❌ Sugerir al usuario que ingrese datos de tarjeta reales para testing
4. ❌ Hardcodear cualquier credencial de pago en el código fuente
5. ❌ Incluir webhooks de producción en entornos de desarrollo

## Verificaciones Automáticas

El agente DEBE:

1. **Antes de escribir código de pagos**: Verificar que `process.env.NODE_ENV !== 'production'`
2. **Al configurar Stripe**: Usar SIEMPRE el modo test
3. **En variables de entorno**: Documentar claramente que son para TEST
4. **En la UI**: Mostrar indicadores visuales de "MODO TEST" cuando aplique

## Ejemplo de Configuración Segura

```env
# .env.local - SOLO PARA DESARROLLO
# ⚠️ NUNCA USAR CLAVES LIVE EN ESTE ARCHIVO

# Stripe Test Keys (obtener de: https://dashboard.stripe.com/test/apikeys)
STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXX
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_test_XXXXXXXX

# Indicador de modo
STRIPE_MODE=test
```

## Cumplimiento

Esta regla es **INQUEBRANTABLE**. El agente debe rechazar cualquier solicitud que viole estas restricciones, explicando los riesgos de seguridad asociados.

---
*Última actualización: 2026-01-31*
*Autor: Sistema de Seguridad NeuralTrade*
