# TODO - VertexERP Muebles v2.0 - Mejoras Críticas

✅ **PLAN APROBADO POR USUARIO** - Comenzar en orden, **nada simulado/mock**

## 📋 CHECKLIST DE IMPLEMENTACIÓN (Prioridad 1-4)

### **PRIORIDAD 1 🚀 UX CRÍTICA** [EN PROCESO]

- [ ] **1.1** Crear TODO.md ✅ **COMPLETADO**
- [✅] **1.2** `app/components/layout/sidebar.tsx` - Reordenado ✅
  - Dashboard siempre primero
  - Clientes segundo
  - Cobranza/Ventas según rol
  - Reportes/Tesoreria al final
  - Icons consistentes + tooltips
- [ ] **1.3** `app/components/clientes/ClienteModal.tsx` - Refactor masivo
  - react-hook-form + yup validation
  - Lazy tabs (Suspense)
  - Mobile responsive
  - Loading states
- [ ] **1.4** `public/manifest.json` - PWA optimizado ✅
  - Quick buttons más grandes
  - Touch targets 48px+
  - Swipe to close
  - Haptic feedback

### **PRIORIDAD 2 ⚡ ESTABILIDAD/SEGURIDAD**

- [ ] **2.1** `app/lib/auth.ts` + Rate limiting (upstash/redis)
- [ ] **2.2** `app/middleware.ts` + CSP/HSTS/Referrer-Policy
- [ ] **2.3** `app/lib/sync-service.ts` + Race condition fixes
- [ ] **2.4** `prisma/schema.prisma` + Audit fields/soft deletes

### **PRIORIDAD 3 🎯 PERFORMANCE/PWA**

- [ ] **3.1** `public/sw.js` + Workbox precaching
- [ ] **3.2** `public/manifest.json` + Screenshots/scope
- [ ] **3.3** `next.config.js` + Dynamic imports/analyzer
- [ ] **3.4** Lighthouse PWA score 100%

### **PRIORIDAD 4 🎨 UI/UX FINAL**

- [ ] **4.1** Custom CSS + Focus-visible
- [ ] **4.2** Mega menú responsive
- [ ] **4.3** Theme builder (dark/light toggle)

## **COMANDOS ÚTILES**
```bash
# Test PWA
npx lighthouse app/ --view

# Test bundle
npx @next/bundle-analyzer

# Test mobile
npx cap sync android
npx cap run android
```

## **CRITERIOS DE ACEPTACIÓN**
- ✅ Lighthouse PWA: 100%
- ✅ Bundle < 500KB gzipped
- ✅ Modales < 2s load time
- ✅ Sync 100% reliable (retry logic)
- ✅ Seguridad auditada

**Próximo paso: 1.2 - Refactor sidebar.tsx**
