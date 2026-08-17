import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * Les tests portent sur la logique métier pure de `lib/clyde` : ni DOM ni
 * navigateur, d'où l'environnement `node` — les règles d'idempotence des bonus
 * ou de calcul de prix n'ont pas besoin d'un rendu pour être vérifiées.
 *
 * L'alias `@/` doit être répété ici : vitest ne lit pas les `paths` du
 * tsconfig, et `demo-data` charge les crédits d'images par ce chemin.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
